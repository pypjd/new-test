import type { RoutePreference } from '../types/trip'

const AMAP_INPUT_TIPS_URL = 'https://restapi.amap.com/v3/assistant/inputtips'
const AMAP_DRIVING_URL = 'https://restapi.amap.com/v3/direction/driving'

export interface AMapTip {
  id?: string
  name: string
  district?: string
  address?: string
  location?: string
  typecode?: string
}

export interface AMapPlaceSuggestion {
  id?: string
  name: string
  displayName: string
  lat: number
  lng: number
}

export interface DrivingRequestPoint {
  lat: number
  lng: number
}

export interface DrivingRouteResult {
  polyline: Array<[number, number]>
  distanceText: string
  durationText: string
}

export interface AMapServiceError {
  code?: string
  message: string
}

function getAmapKey(): string {
  const key = import.meta.env.VITE_AMAP_KEY
  return typeof key === 'string' ? key.trim() : ''
}

function toLonLatText(point: DrivingRequestPoint): string {
  return `${point.lng},${point.lat}`
}

function parseLocationText(location: string): { lat: number; lng: number } | null {
  const [lngText, latText] = location.split(',')
  const lng = Number(lngText)
  const lat = Number(latText)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

function preferenceToStrategy(preference: RoutePreference): string {
  if (preference === 'HIGHWAY_FIRST') return '0'
  if (preference === 'LESS_TOLL') return '4'
  if (preference === 'AVOID_TOLL') return '1'
  if (preference === 'NORMAL_ROAD_FIRST') return '2'
  return '0'
}

function ensureKey(): AMapServiceError | null {
  return getAmapKey() ? null : { code: 'NO_KEY', message: '未配置 VITE_AMAP_KEY，无法调用高德 API。' }
}

export async function searchAmapInputTips(
  keywords: string,
  signal?: AbortSignal,
): Promise<{ tips: AMapPlaceSuggestion[]; error: AMapServiceError | null }> {
  const keyError = ensureKey()
  if (keyError) return { tips: [], error: keyError }

  const q = keywords.trim()
  if (q.length < 2) return { tips: [], error: null }

  const url = new URL(AMAP_INPUT_TIPS_URL)
  url.searchParams.set('key', getAmapKey())
  url.searchParams.set('keywords', q)
  url.searchParams.set('datatype', 'all')
  url.searchParams.set('citylimit', 'false')

  try {
    const response = await fetch(url.toString(), { signal })
    if (!response.ok) {
      return {
        tips: [],
        error: { code: String(response.status), message: `高德输入提示请求失败（HTTP ${response.status}）。` },
      }
    }

    const data = (await response.json()) as {
      status?: string
      info?: string
      infocode?: string
      tips?: AMapTip[]
    }

    if (data.status !== '1') {
      return {
        tips: [],
        error: {
          code: data.infocode,
          message: `高德输入提示失败：${data.info ?? '未知错误'}`,
        },
      }
    }

    const tips: AMapPlaceSuggestion[] = []
    for (const item of data.tips ?? []) {
      if (!item.location) continue
      const point = parseLocationText(item.location)
      if (!point) continue
      const displayName = [item.name, item.district, item.address].filter(Boolean).join(' · ')
      tips.push({
        id: item.id,
        name: item.name,
        displayName: displayName || item.name,
        lat: point.lat,
        lng: point.lng,
      })
    }

    return { tips, error: null }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return { tips: [], error: null }
    return { tips: [], error: { message: '高德输入提示请求失败，请稍后重试。' } }
  }
}

export async function planDrivingRoute(
  points: DrivingRequestPoint[],
  preference: RoutePreference,
): Promise<{ route: DrivingRouteResult | null; error: AMapServiceError | null }> {
  const keyError = ensureKey()
  if (keyError) return { route: null, error: keyError }
  if (points.length < 2) return { route: null, error: { code: 'POINTS_NOT_ENOUGH', message: '路径规划至少需要起点和终点。' } }

  const url = new URL(AMAP_DRIVING_URL)
  url.searchParams.set('key', getAmapKey())
  url.searchParams.set('origin', toLonLatText(points[0]))
  url.searchParams.set('destination', toLonLatText(points[points.length - 1]))
  if (points.length > 2) {
    const waypoints = points.slice(1, -1).map(toLonLatText).join(';')
    if (waypoints) url.searchParams.set('waypoints', waypoints)
  }
  url.searchParams.set('strategy', preferenceToStrategy(preference))
  url.searchParams.set('extensions', 'base')

  try {
    const response = await fetch(url.toString())
    if (!response.ok) {
      return {
        route: null,
        error: { code: String(response.status), message: `高德驾车规划失败（HTTP ${response.status}）。` },
      }
    }

    const data = (await response.json()) as {
      status?: string
      info?: string
      infocode?: string
      route?: {
        paths?: Array<{
          distance?: string
          duration?: string
          steps?: Array<{ polyline?: string }>
        }>
      }
    }

    if (data.status !== '1') {
      return {
        route: null,
        error: { code: data.infocode, message: `高德驾车规划失败：${data.info ?? '未知错误'}` },
      }
    }

    const path = data.route?.paths?.[0]
    if (!path) {
      return { route: null, error: { code: 'NO_PATH', message: '高德未返回可用路线。' } }
    }

    const pointsList: Array<[number, number]> = []
    for (const step of path.steps ?? []) {
      if (!step.polyline) continue
      for (const rawPair of step.polyline.split(';')) {
        const parsed = parseLocationText(rawPair)
        if (parsed) pointsList.push([parsed.lat, parsed.lng])
      }
    }

    if (!pointsList.length) {
      return { route: null, error: { code: 'EMPTY_POLYLINE', message: '高德返回路线为空。' } }
    }

    return {
      route: {
        polyline: pointsList,
        distanceText: path.distance ? `${path.distance} 米` : '未知',
        durationText: path.duration ? `${path.duration} 秒` : '未知',
      },
      error: null,
    }
  } catch {
    return {
      route: null,
      error: { message: '高德驾车规划请求失败，请检查网络或稍后重试。' },
    }
  }
}
