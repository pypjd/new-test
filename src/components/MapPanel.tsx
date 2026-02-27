import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L, { type LatLngExpression } from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { FilterState, RouteSegment } from '../types/trip'
import { geocodePlacesSerial, normalizePlaceName } from '../utils/geocode'

interface MapPanelProps {
  filteredSegments: RouteSegment[]
  filters: FilterState
}

interface SegmentTrack {
  segmentId: string
  segmentName: string
  points: Array<{ name: string; lat: number; lon: number; type: 'start' | 'via' | 'end' }>
}

interface ViewportControllerProps {
  points: LatLngExpression[]
}

const defaultCenter: [number, number] = [35.8617, 104.1954]

// 修复 Leaflet 在 Vite 下默认 marker 图标路径。
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

function ViewportController({ points }: ViewportControllerProps) {
  const map = useMap()

  useEffect(() => {
    if (!points.length) return

    if (points.length === 1) {
      map.setView(points[0], 11)
      return
    }

    map.fitBounds(L.latLngBounds(points), { padding: [24, 24] })
  }, [map, points])

  return null
}

function splitViaPoints(viaPointsText: string): string[] {
  return viaPointsText
    .split(',')
    .map((item) => normalizePlaceName(item))
    .filter(Boolean)
}

// 地图轨迹面板：根据当前筛选路段做地理编码并绘制 marker/polyline。
function MapPanel({ filteredSegments, filters }: MapPanelProps) {
  const [tracks, setTracks] = useState<SegmentTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('请选择旅程/日期/路段以查看轨迹')

  const shouldPromptSelectMore = Boolean(filters.tripId && !filters.dayId && !filters.segmentId)

  useEffect(() => {
    let active = true

    async function buildTracks() {
      if (!filteredSegments.length || shouldPromptSelectMore) {
        setTracks([])
        setLoading(false)
        setMessage('请选择旅程/日期/路段以查看轨迹')
        return
      }

      setLoading(true)
      setMessage('正在加载轨迹点位...')

      const placeNames = filteredSegments.flatMap((segment) => [
        normalizePlaceName(segment.startPoint),
        ...splitViaPoints(segment.viaPointsText),
        normalizePlaceName(segment.endPoint),
      ])

      const geoMap = await geocodePlacesSerial(placeNames)
      if (!active) return

      const nextTracks: SegmentTrack[] = filteredSegments
        .map((segment) => {
          const orderedNames = [
            normalizePlaceName(segment.startPoint),
            ...splitViaPoints(segment.viaPointsText),
            normalizePlaceName(segment.endPoint),
          ]

          const points = orderedNames
            .map((name, index) => {
              const geo = geoMap[name]
              if (!geo) return null

              let type: 'start' | 'via' | 'end' = 'via'
              if (index === 0) type = 'start'
              if (index === orderedNames.length - 1) type = 'end'

              return {
                name,
                lat: geo.lat,
                lon: geo.lon,
                type,
              }
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item))

          return {
            segmentId: segment.id,
            segmentName: segment.name,
            points,
          }
        })
        .filter((track) => track.points.length >= 1)

      setTracks(nextTracks)
      setLoading(false)

      if (!nextTracks.length) {
        setMessage('未能解析有效地点，请检查起点/终点/途径点文本。')
      } else {
        const hasSkipped = nextTracks.some((track, index) => {
          const expected = 2 + splitViaPoints(filteredSegments[index].viaPointsText).length
          return track.points.length < expected
        })
        setMessage(hasSkipped ? '部分地点解析失败，已跳过不可用点位。' : '')
      }
    }

    void buildTracks()

    return () => {
      active = false
    }
  }, [filteredSegments, shouldPromptSelectMore])

  const allLatLng = useMemo(
    () => tracks.flatMap((track) => track.points.map((point) => [point.lat, point.lon] as LatLngExpression)),
    [tracks],
  )

  return (
    <section className="card-section">
      <h2>4) 地图轨迹</h2>

      {(loading || message) && <p className="hint-text">{loading ? '正在加载轨迹点位...' : message}</p>}

      <div className="map-panel-wrapper">
        <MapContainer center={defaultCenter} zoom={4} className="map-container">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {tracks.map((track) => {
            const polylinePositions = track.points.map((point) => [point.lat, point.lon] as LatLngExpression)
            if (polylinePositions.length < 2) return null
            return (
              <Polyline key={track.segmentId} positions={polylinePositions} color="#2563eb" weight={4} />
            )
          })}

          {tracks.flatMap((track) =>
            track.points.map((point, index) => (
              <Marker key={`${track.segmentId}-${point.name}-${index}`} position={[point.lat, point.lon]}>
                <Popup>
                  <div>
                    <strong>{track.segmentName}</strong>
                    <br />
                    {point.type === 'start' && '起点'}
                    {point.type === 'end' && '终点'}
                    {point.type === 'via' && '途径点'}
                    ：{point.name}
                  </div>
                </Popup>
              </Marker>
            )),
          )}

          <ViewportController points={allLatLng} />
        </MapContainer>
      </div>
    </section>
  )
}

export default MapPanel
