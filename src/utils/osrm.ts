export interface RoadPoint {
  lat: number
  lon: number
}


// OSRM 路网轨迹：根据经纬度点序列获取沿道路的路径坐标（返回 Leaflet 使用的 [lat, lon]）。
export async function fetchRoadPolyline(points: RoadPoint[]): Promise<Array<[number, number]> | null> {
  if (points.length < 2) return null

  const joined = points.map((point) => `${point.lon},${point.lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${joined}?overview=full&geometries=geojson&steps=false`

  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const data = (await response.json()) as {
      code?: string
      routes?: Array<{ geometry?: { coordinates?: Array<[number, number]> } }>
    }

    const route = data.routes?.[0]
    const coordinates = route?.geometry?.coordinates
    if (!coordinates || !coordinates.length) return null

    // OSRM 坐标顺序是 [lon, lat]，这里转换为 Leaflet 使用的 [lat, lon]。
    return coordinates.map(([lon, lat]) => [lat, lon])
  } catch {
    return null
  }
}
