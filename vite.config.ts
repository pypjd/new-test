import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error local JS proxy handler
import { createInputTipsProxyHandler } from './server/amapInputTipsProxy.js'

declare const process: { cwd: () => string }

function readOptionalParam(url: URL, key: string): string | null {
  const value = url.searchParams.get(key)
  if (!value) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function writeJson(response: any, statusCode: number, body: unknown): void {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}

async function fetchWithTimeout(targetUrl: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(targetUrl, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function createDirectionProxy(amapWebKey: string) {
  return async function handleDirection(req: any, res: any) {
    if (!req.url) {
      writeJson(res, 400, { ok: false, message: '缺少请求 URL' })
      return
    }

    if (!amapWebKey) {
      writeJson(res, 500, { ok: false, message: 'AMAP_WEB_KEY missing' })
      return
    }

    const requestUrl = new URL(req.url, 'http://localhost')
    const origin = readOptionalParam(requestUrl, 'origin')
    const destination = readOptionalParam(requestUrl, 'destination')
    const strategy = readOptionalParam(requestUrl, 'strategy') ?? '0'
    const waypoints = readOptionalParam(requestUrl, 'waypoints')

    if (!origin || !destination) {
      writeJson(res, 400, { ok: false, message: 'origin 和 destination 为必填参数' })
      return
    }

    const targetUrl = new URL('https://restapi.amap.com/v3/direction/driving')
    targetUrl.searchParams.set('key', amapWebKey)
    targetUrl.searchParams.set('origin', origin)
    targetUrl.searchParams.set('destination', destination)
    targetUrl.searchParams.set('strategy', strategy)
    if (waypoints) {
      targetUrl.searchParams.set('waypoints', waypoints.replace(/\|/g, ';'))
    }

    try {
      const upstream = await fetchWithTimeout(targetUrl.toString(), 5000)
      const data = (await upstream.json()) as unknown
      if (!upstream.ok) {
        writeJson(res, upstream.status, { ok: false, message: 'direction upstream error', detail: data })
        return
      }
      writeJson(res, 200, { ok: true, data })
    } catch (error) {
      const message = (error as Error).name === 'AbortError' ? 'direction timeout(5s)' : 'direction proxy failed'
      writeJson(res, 502, { ok: false, message })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const amapWebKey = env.AMAP_KEY ?? env.AMAP_WEB_KEY ?? ''
  const inputTipsProxy = createInputTipsProxyHandler({ amapKey: amapWebKey })
  const directionProxy = createDirectionProxy(amapWebKey)

  return {
    plugins: [
      react(),
      {
        name: 'amap-web-proxy',
        configureServer(server) {
          server.middlewares.use('/api/amap/inputtips', inputTipsProxy)
          server.middlewares.use('/api/amap/direction', directionProxy)
        },
        configurePreviewServer(server) {
          server.middlewares.use('/api/amap/inputtips', inputTipsProxy)
          server.middlewares.use('/api/amap/direction', directionProxy)
        },
      },
    ],
  }
})
