// 地理编码工具：使用 OSM Nominatim 把地点文本转为经纬度，并做本地缓存与串行节流。

const GEO_CACHE_KEY = 'geoCache_v1'
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q='

export interface GeoPoint {
  lat: number
  lon: number
  label: string
}

type GeoCache = Record<string, GeoPoint>

export function normalizePlaceName(place: string): string {
  return place.trim().replace(/\s+/g, ' ')
}

function loadGeoCache(): GeoCache {
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as GeoCache
  } catch {
    return {}
  }
}

function saveGeoCache(cache: GeoCache): void {
  localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache))
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export async function geocodePlace(place: string): Promise<GeoPoint | null> {
  const normalized = normalizePlaceName(place)
  if (!normalized) return null

  const cache = loadGeoCache()
  if (cache[normalized]) {
    return cache[normalized]
  }

  try {
    const response = await fetch(`${NOMINATIM_URL}${encodeURIComponent(normalized)}`, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>
    if (!data.length) {
      return null
    }

    const first = data[0]
    const point: GeoPoint = {
      lat: Number(first.lat),
      lon: Number(first.lon),
      label: first.display_name,
    }

    if (Number.isNaN(point.lat) || Number.isNaN(point.lon)) {
      return null
    }

    cache[normalized] = point
    saveGeoCache(cache)
    return point
  } catch {
    return null
  }
}

export async function geocodePlacesSerial(places: string[]): Promise<Record<string, GeoPoint>> {
  const result: Record<string, GeoPoint> = {}

  for (const place of places) {
    const normalized = normalizePlaceName(place)
    if (!normalized || result[normalized]) continue

    const point = await geocodePlace(normalized)
    if (point) {
      result[normalized] = point
    }

    // 串行请求间隔，避免触发公共服务限流。
    await delay(450)
  }

  return result
}
