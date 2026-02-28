import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet'
import L, { type DivIcon, type LatLngExpression } from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { CoordPoint, FilterState, RouteSegment } from '../types/trip'
import { geocodePlacesSerial, normalizePlaceName } from '../utils/geocode'
import { fetchRoadPolyline } from '../utils/osrm'

interface MapPanelProps {
  filteredSegments: RouteSegment[]
  filters: FilterState
  editingSegmentId: string | null
  onStartEdit: (segmentId: string) => void
  onCancelEdit: () => void
  onSaveEdit: (payload: {
    segmentId: string
    startCoord: CoordPoint
    endCoord: CoordPoint
    points: CoordPoint[]
  }) => void
  selectedWaypoint: { id: string; lat: number; lon: number } | null
  onTracksComputed: (tracks: Record<string, CoordPoint[]>) => void
}

type PointKind = 'start' | 'via' | 'end'

interface SegmentTrack {
  segmentId: string
  segmentName: string
  points: Array<{ name: string; lat: number; lon: number; type: PointKind }>
  line: LatLngExpression[]
}

interface ViewportControllerProps {
  points: LatLngExpression[]
}

interface WaypointFocusControllerProps {
  waypoint: { id: string; lat: number; lon: number } | null
}

const defaultCenter: [number, number] = [35.8617, 104.1954]

// 修复 Leaflet 在 Vite 下默认 marker 图标路径。
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const pointIcons: Record<PointKind, DivIcon> = {
  start: L.divIcon({
    className: 'custom-point-icon-wrapper',
    html: '<div class="custom-point-icon start">S</div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  }),
  end: L.divIcon({
    className: 'custom-point-icon-wrapper',
    html: '<div class="custom-point-icon end">E</div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  }),
  via: L.divIcon({
    className: 'custom-point-icon-wrapper',
    html: '<div class="custom-point-icon via">•</div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  }),
}

const selectedWaypointIcon = L.divIcon({
  className: 'custom-point-icon-wrapper',
  html: '<div class="custom-point-icon waypoint-selected">★</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
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

function WaypointFocusController({ waypoint }: WaypointFocusControllerProps) {
  const map = useMap()

  useEffect(() => {
    if (!waypoint) return
    map.flyTo([waypoint.lat, waypoint.lon], Math.max(map.getZoom(), 12), { duration: 0.8 })
  }, [map, waypoint])

  return null
}

function splitViaPoints(viaPointsText: string): string[] {
  return viaPointsText
    .split(',')
    .map((item) => normalizePlaceName(item))
    .filter(Boolean)
}

// 地图轨迹面板：支持轨迹编辑（拖拽起终点）与途经点定位联动。
function MapPanel({
  filteredSegments,
  filters,
  editingSegmentId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  selectedWaypoint,
  onTracksComputed,
}: MapPanelProps) {
  const [tracks, setTracks] = useState<SegmentTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('请选择旅程/日期/路段以查看轨迹')
  const [draftStart, setDraftStart] = useState<{ lat: number; lon: number } | null>(null)
  const [draftEnd, setDraftEnd] = useState<{ lat: number; lon: number } | null>(null)

  const shouldPromptSelectMore = Boolean(filters.tripId && !filters.dayId && !filters.segmentId)

  useEffect(() => {
    let active = true

    async function buildTracks() {
      if (!filteredSegments.length || shouldPromptSelectMore) {
        setTracks([])
        setLoading(false)
        setMessage('请选择旅程/日期/路段以查看轨迹')
        onTracksComputed({})
        return
      }

      setLoading(true)
      setMessage('正在加载轨迹点位...')

      const placeItems = filteredSegments.flatMap((segment) => {
        const viaItems = splitViaPoints(segment.viaPointsText).map((place) => ({
          place,
          context: segment.name,
        }))

        return [
          ...(segment.startCoord ? [] : [{ place: normalizePlaceName(segment.startPoint), context: segment.name }]),
          ...viaItems,
          ...(segment.endCoord ? [] : [{ place: normalizePlaceName(segment.endPoint), context: segment.name }]),
        ]
      })

      const geoMap = await geocodePlacesSerial(placeItems)
      if (!active) return

      let hasSkippedPoint = false
      let hasOsrmFallback = false

      const nextTracks: SegmentTrack[] = []
      const pointsForParent: Record<string, CoordPoint[]> = {}

      for (const segment of filteredSegments) {
        const points: SegmentTrack['points'] = []

        const startName = normalizePlaceName(segment.startPoint)
        if (segment.startCoord) {
          points.push({
            name: startName,
            lat: segment.startCoord.lat,
            lon: segment.startCoord.lon,
            type: 'start',
          })
        } else if (geoMap[startName]) {
          points.push({
            name: startName,
            lat: geoMap[startName].lat,
            lon: geoMap[startName].lon,
            type: 'start',
          })
        }

        for (const viaName of splitViaPoints(segment.viaPointsText)) {
          const geo = geoMap[viaName]
          if (geo) {
            points.push({ name: viaName, lat: geo.lat, lon: geo.lon, type: 'via' })
          } else {
            hasSkippedPoint = true
          }
        }

        const endName = normalizePlaceName(segment.endPoint)
        if (segment.endCoord) {
          points.push({
            name: endName,
            lat: segment.endCoord.lat,
            lon: segment.endCoord.lon,
            type: 'end',
          })
        } else if (geoMap[endName]) {
          points.push({
            name: endName,
            lat: geoMap[endName].lat,
            lon: geoMap[endName].lon,
            type: 'end',
          })
        }

        const shouldHavePoints = 2 + splitViaPoints(segment.viaPointsText).length
        if (points.length < shouldHavePoints) {
          hasSkippedPoint = true
        }

        if (!points.length) {
          continue
        }

        let line: LatLngExpression[] = points.map((point) => [point.lat, point.lon] as LatLngExpression)

        if (points.length >= 2) {
          const osrmLine = await fetchRoadPolyline(points)
          if (osrmLine?.length) {
            line = osrmLine
          } else {
            hasOsrmFallback = true
          }
        }

        const storedPoints = line.map((latlng) => {
          const [lat, lon] = latlng as [number, number]
          return { lat, lon }
        })
        pointsForParent[segment.id] = storedPoints

        nextTracks.push({
          segmentId: segment.id,
          segmentName: segment.name,
          points,
          line,
        })
      }

      if (!active) return

      setTracks(nextTracks)
      onTracksComputed(pointsForParent)
      setLoading(false)

      const messageParts: string[] = []
      if (!nextTracks.length) {
        messageParts.push('未能解析有效地点，请检查起点/终点/途径点文本。')
      }
      if (hasSkippedPoint) {
        messageParts.push('部分地点解析失败，已跳过不可用点位。')
      }
      if (hasOsrmFallback) {
        messageParts.push('路网轨迹生成失败，已使用直线连接。')
      }

      setMessage(messageParts.join(' '))
    }

    void buildTracks()

    return () => {
      active = false
    }
  }, [filteredSegments, shouldPromptSelectMore, onTracksComputed])

  const editingTrack = useMemo(
    () => (editingSegmentId ? tracks.find((track) => track.segmentId === editingSegmentId) ?? null : null),
    [tracks, editingSegmentId],
  )

  useEffect(() => {
    if (!editingTrack) {
      setDraftStart(null)
      setDraftEnd(null)
      return
    }

    const start = editingTrack.points.find((point) => point.type === 'start')
    const end = [...editingTrack.points].reverse().find((point) => point.type === 'end')
    setDraftStart(start ? { lat: start.lat, lon: start.lon } : null)
    setDraftEnd(end ? { lat: end.lat, lon: end.lon } : null)
  }, [editingTrack])

  const displayedTracks = useMemo(() => {
    if (!editingTrack || !draftStart || !draftEnd) return tracks

    return tracks.map((track) => {
      if (track.segmentId !== editingTrack.segmentId) return track

      const mutableLine = [...track.line]
      if (mutableLine.length >= 1) {
        mutableLine[0] = [draftStart.lat, draftStart.lon]
        mutableLine[mutableLine.length - 1] = [draftEnd.lat, draftEnd.lon]
      }

      const mutablePoints = track.points.map((point) => {
        if (point.type === 'start') return { ...point, lat: draftStart.lat, lon: draftStart.lon }
        if (point.type === 'end') return { ...point, lat: draftEnd.lat, lon: draftEnd.lon }
        return point
      })

      return {
        ...track,
        line: mutableLine,
        points: mutablePoints,
      }
    })
  }, [tracks, editingTrack, draftStart, draftEnd])

  const allLatLng = useMemo(
    () =>
      displayedTracks.flatMap((track) =>
        track.line.length ? track.line : track.points.map((point) => [point.lat, point.lon] as LatLngExpression),
      ),
    [displayedTracks],
  )

  const handleSaveEdit = () => {
    if (!editingTrack || !draftStart || !draftEnd) return

    const target = displayedTracks.find((track) => track.segmentId === editingTrack.segmentId)
    if (!target || target.line.length < 2) return

    onSaveEdit({
      segmentId: editingTrack.segmentId,
      startCoord: { lat: draftStart.lat, lon: draftStart.lon },
      endCoord: { lat: draftEnd.lat, lon: draftEnd.lon },
      points: target.line.map((latlng) => {
        const [lat, lon] = latlng as [number, number]
        return { lat, lon }
      }),
    })
  }

  return (
    <section className="card-section map-section-with-toolbar">
      <h2>4) 地图轨迹</h2>

      {(loading || message) && <p className="hint-text">{loading ? '正在加载轨迹点位...' : message}</p>}

      <div className="map-toolbar">
        {!editingSegmentId ? (
          <button
            type="button"
            onClick={() => {
              if (filteredSegments[0]) onStartEdit(filteredSegments[0].id)
            }}
            disabled={!filteredSegments.length}
          >
            编辑轨迹
          </button>
        ) : (
          <>
            <button type="button" onClick={onCancelEdit}>
              取消
            </button>
            <button type="button" onClick={handleSaveEdit}>
              保存
            </button>
          </>
        )}
      </div>

      <div className="map-panel-wrapper">
        <MapContainer center={defaultCenter} zoom={4} className="map-container">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {displayedTracks.map((track) =>
            track.line.length >= 2 ? (
              <Polyline key={track.segmentId} positions={track.line} color="#2563eb" weight={4} />
            ) : null,
          )}

          {displayedTracks.flatMap((track) =>
            track.points.map((point, index) => {
              const isEditable = editingSegmentId === track.segmentId && (point.type === 'start' || point.type === 'end')
              return (
                <Marker
                  key={`${track.segmentId}-${point.name}-${index}`}
                  position={[point.lat, point.lon]}
                  icon={pointIcons[point.type]}
                  draggable={isEditable}
                  eventHandlers={
                    isEditable
                      ? {
                          drag: (event) => {
                            const latlng = event.target.getLatLng()
                            if (point.type === 'start') {
                              setDraftStart({ lat: latlng.lat, lon: latlng.lng })
                            } else {
                              setDraftEnd({ lat: latlng.lat, lon: latlng.lng })
                            }
                          },
                        }
                      : undefined
                  }
                >
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
              )
            }),
          )}

          {selectedWaypoint ? (
            <Marker position={[selectedWaypoint.lat, selectedWaypoint.lon]} icon={selectedWaypointIcon}>
              <Popup>已定位到所选途经点</Popup>
            </Marker>
          ) : null}

          <WaypointFocusController waypoint={selectedWaypoint} />
          <ViewportController points={allLatLng} />
        </MapContainer>
      </div>
    </section>
  )
}

export default MapPanel
