import test from 'node:test'
import assert from 'node:assert/strict'
import { createInputTipsProxyHandler } from '../server/amapInputTipsProxy.js'

function makeReq(url, headers = {}) {
  return {
    url,
    headers: { 'user-agent': 'node-test', referer: 'http://localhost:5173', ...headers },
    socket: { remoteAddress: '127.0.0.1' },
  }
}

function makeRes() {
  const payload = { statusCode: 200, body: '' }
  return {
    setHeader() {},
    end(text) {
      payload.body = text
    },
    get json() {
      return JSON.parse(payload.body || '{}')
    },
    set statusCode(v) {
      payload.statusCode = v
    },
    get statusCode() {
      return payload.statusCode
    },
  }
}

test('keywords length < 2 should return empty and not call upstream', async () => {
  let called = 0
  const handler = createInputTipsProxyHandler({
    amapKey: 'k',
    fetchImpl: async () => {
      called += 1
      throw new Error('should not call')
    },
  })

  const req = makeReq('/api/amap/inputtips?keywords=a')
  const res = makeRes()
  await handler(req, res)

  assert.equal(res.statusCode, 200)
  assert.equal(called, 0)
  assert.equal(res.json.ok, true)
  assert.deepEqual(res.json.data, [])
})

test('same query should hit cache and only call upstream once', async () => {
  let called = 0
  const handler = createInputTipsProxyHandler({
    amapKey: 'k',
    fetchImpl: async () => {
      called += 1
      return {
        json: async () => ({ tips: [{ name: '天安门', location: '116.1,39.9' }] }),
      }
    },
  })

  const req = makeReq('/api/amap/inputtips?keywords=天安门&city=北京&datatype=all')
  const res1 = makeRes()
  const res2 = makeRes()

  await handler(req, res1)
  await handler(req, res2)

  assert.equal(called, 1)
  assert.equal(res1.json.cached, false)
  assert.equal(res2.json.cached, true)
  assert.equal(res2.json.data.length, 1)
})

test('rate limit should return 429', async () => {
  let now = 0
  const handler = createInputTipsProxyHandler({
    amapKey: 'k',
    rateLimitPerMinute: 1,
    now: () => now,
    fetchImpl: async () => ({ json: async () => ({ tips: [] }) }),
  })

  const req = makeReq('/api/amap/inputtips?keywords=上海')

  const res1 = makeRes()
  await handler(req, res1)
  assert.equal(res1.statusCode, 200)

  const res2 = makeRes()
  await handler(req, res2)
  assert.equal(res2.statusCode, 429)
  assert.equal(res2.json.reason, 'RATE_LIMITED')

  now = 61000
  const res3 = makeRes()
  await handler(req, res3)
  assert.equal(res3.statusCode, 200)
})
