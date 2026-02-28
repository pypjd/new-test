import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet'
import L, { type DivIcon, type LatLngExpression } from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { CoordPoint, FilterState, RouteSegment, Waypoint } from '../types/trip'
import { geocodePlacesSerial, normalizePlaceName } from '../utils/geocode'
import { fetchRoadPolyline } from '../utils/osrm'

interface EndpointDraft {
  segmentId: string
  startCoord?: CoordPoint
  endCoord?: CoordPoint
}

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
  selectedWaypoint: Waypoint | null
  onTracksComputed: (tracks: Record<string, CoordPoint[]>) => void
  endpointDraft: EndpointDraft | null
  onEndpointDraftChange: (payload: {
    segmentId: string
    startCoord?: CoordPoint
    endCoord?: CoordPoint
  }) => void
}

type PointKind = 'start' | 'via' | 'end'
type EditMode = 'start' | 'end' | 'track'

interface SegmentTrack {
  segmentId: string
  segmentName: string
  points: Array<{ name: string; lat: number; lon: number; type: PointKind }>
  line: CoordPoint[]
}

interface ViewportControllerProps {
  points: LatLngExpression[]
}

interface WaypointFocusControllerProps {
  waypoint: Waypoint | null
}

const defaultCenter: [number, number] = [35.8617, 104.1954]
const CONTROL_POINT_STEP = 25
const CONTROL_POINT_MAX = 16

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

const controlPointIcon = L.divIcon({
  className: 'custom-point-icon-wrapper',
  html: '<div class="custom-point-icon control">●</div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

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
    if (!waypoint || typeof waypoint.lat !== 'number' || typeof waypoint.lng !== 'number') return
    map.flyTo([waypoint.lat, waypoint.lng], Math.max(map.getZoom(), 12), { duration: 0.8 })
  }, [map, waypoint])

  return null
}

function splitViaPoints(viaPointsText: string): string[] {
  return viaPointsText
    .split(',')
    .map((item) => normalizePlaceName(item))
    .filter(Boolean)
}

function toLatLng(points: CoordPoint[]): LatLngExpression[] {
  return points.map((point) => [point.lat, point.lon] as LatLngExpression)
}

// 地图轨迹面板：支持改起点/改终点/改轨迹三种编辑模式并可保存回滚。
function MapPanel({
  filteredSegments,
  filters,
  editingSegmentId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  selectedWaypoint,
  onTracksComputed,
  endpointDraft,
  onEndpointDraftChange,
}: MapPanelProps) {
  const [tracks, setTracks] = useState<SegmentTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('请选择旅程/日期/路段以查看轨迹')
  const [editMode, setEditMode] = useState<EditMode>('start')
  const [draftLine, setDraftLine] = useState<CoordPoint[] | null>(null)
  const [originalLine, setOriginalLine] = useState<CoordPoint[] | null>(null)

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
          points.push({ name: startName, lat: segment.startCoord.lat, lon: segment.startCoord.lon, type: 'start' })
        } else if (geoMap[startName]) {
          points.push({ name: startName, lat: geoMap[startName].lat, lon: geoMap[startName].lon, type: 'start' })
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
          points.push({ name: endName, lat: segment.endCoord.lat, lon: segment.endCoord.lon, type: 'end' })
        } else if (geoMap[endName]) {
          points.push({ name: endName, lat: geoMap[endName].lat, lon: geoMap[endName].lon, type: 'end' })
        }

        if (!points.length) continue

        let line: CoordPoint[] = points.map((point) => ({ lat: point.lat, lon: point.lon }))

        if (points.length >= 2) {
          const osrmLine = await fetchRoadPolyline(points, segment.preference)
          if (osrmLine?.length) {
            line = osrmLine.map(([lat, lon]) => ({ lat, lon }))
          } else {
            hasOsrmFallback = true
          }
        }

        pointsForParent[segment.id] = line
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
      if (!nextTracks.length) messageParts.push('未能解析有效地点，请检查起点/终点/途径点文本。')
      if (hasSkippedPoint) messageParts.push('部分地点解析失败，已跳过不可用点位。')
      if (hasOsrmFallback) messageParts.push('路网轨迹生成失败，已使用直线连接。')

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
      setDraftLine(null)
      setOriginalLine(null)
      setEditMode('start')
      return
    }

    if (!draftLine) {
      const cloned = editingTrack.line.map((point) => ({ ...point }))
      setDraftLine(cloned)
      setOriginalLine(cloned.map((point) => ({ ...point })))
    }
  }, [editingTrack, draftLine])

  const displayedTracks = useMemo(() => {
    if (!editingTrack || !draftLine) return tracks

    return tracks.map((track) => {
      if (track.segmentId !== editingTrack.segmentId) return track

      const mutablePoints = track.points.map((point, index, arr) => {
        if (!draftLine.length) return point
        if (point.type === 'start') return { ...point, lat: draftLine[0].lat, lon: draftLine[0].lon }
        if (point.type === 'end') {
          const end = draftLine[draftLine.length - 1]
          return { ...point, lat: end.lat, lon: end.lon }
        }
        const viaIndex = Math.floor(((index + 1) / (arr.length + 1)) * draftLine.length)
        const via = draftLine[Math.min(Math.max(viaIndex, 1), draftLine.length - 2)]
        return via ? { ...point, lat: via.lat, lon: via.lon } : point
      })

      return {
        ...track,
        line: draftLine,
        points: mutablePoints,
      }
    })
  }, [tracks, editingTrack, draftLine])

  const controlPointIndices = useMemo(() => {
    if (!draftLine || draftLine.length <= 2 || editMode !== 'track') return []

    const indices: number[] = []
    for (let i = 1; i < draftLine.length - 1; i += CONTROL_POINT_STEP) {
      indices.push(i)
      if (indices.length >= CONTROL_POINT_MAX) break
    }

    if (!indices.length) {
      indices.push(Math.floor(draftLine.length / 2))
    }

    return indices
  }, [draftLine, editMode])

  const allLatLng = useMemo(
    () =>
      displayedTracks.flatMap((track) =>
        track.line.length
          ? toLatLng(track.line)
          : track.points.map((point) => [point.lat, point.lon] as LatLngExpression),
      ),
    [displayedTracks],
  )

  const handleCancel = () => {
    if (originalLine) setDraftLine(originalLine.map((point) => ({ ...point })))
    onCancelEdit()
  }

  const handleSave = () => {
    if (!editingTrack || !draftLine || draftLine.length < 2) return

    onSaveEdit({
      segmentId: editingTrack.segmentId,
      startCoord: { lat: draftLine[0].lat, lon: draftLine[0].lon },
      endCoord: {
        lat: draftLine[draftLine.length - 1].lat,
        lon: draftLine[draftLine.length - 1].lon,
      },
      points: draftLine,
    })
    setDraftLine(null)
    setOriginalLine(null)
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
            <button type="button" onClick={handleCancel}>
              取消
            </button>
            <button type="button" onClick={handleSave}>
              保存
            </button>
            <div className="edit-mode-tabs">
              <button type="button" className={editMode === 'start' ? 'active' : ''} onClick={() => setEditMode('start')}>
                改起点
              </button>
              <button type="button" className={editMode === 'end' ? 'active' : ''} onClick={() => setEditMode('end')}>
                改终点
              </button>
              <button type="button" className={editMode === 'track' ? 'active' : ''} onClick={() => setEditMode('track')}>
                改轨迹
              </button>
            </div>
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
              <Polyline key={track.segmentId} positions={toLatLng(track.line)} color="#2563eb" weight={4} />
            ) : null,
          )}

          {displayedTracks.flatMap((track) =>
            track.points.map((point, index) => {
              const draggable =
                editingSegmentId === track.segmentId &&
                ((editMode === 'start' && point.type === 'start') || (editMode === 'end' && point.type === 'end'))

              return (
                <Marker
                  key={`${track.segmentId}-${point.name}-${index}`}
                  position={[point.lat, point.lon]}
                  icon={pointIcons[point.type]}
                  draggable={draggable}
                  eventHandlers={
                    draggable && draftLine
                      ? {
                          drag: (event: any) => {
                            const marker = event.target as L.Marker
                            const latlng = marker.getLatLng()
                            if (editingSegmentId === track.segmentId) {
                              onEndpointDraftChange({
                                segmentId: track.segmentId,
                                ...(point.type === 'start'
                                  ? { startCoord: { lat: latlng.lat, lon: latlng.lng } }
                                  : { endCoord: { lat: latlng.lat, lon: latlng.lng } }),
                              })
                            }
                            setDraftLine((prev) => {
                              if (!prev || !prev.length) return prev
                              const next = [...prev]
                              if (point.type === 'start') {
                                next[0] = { ...next[0], lat: latlng.lat, lon: latlng.lng }
                              }
                              if (point.type === 'end') {
                                next[next.length - 1] = {
                                  ...next[next.length - 1],
                                  lat: latlng.lat,
                                  lon: latlng.lng,
                                }
                              }
                              return next
                            })
                          },
                        }
                      : undefined
                  }
                >
                  <Popup>
                    {track.segmentName} · {point.type === 'start' ? '起点' : point.type === 'end' ? '终点' : '途径点'}
                  </Popup>
                </Marker>
              )
            }),
          )}

          {editingSegmentId && draftLine &&
            controlPointIndices.map((index) => {
              const point = draftLine[index]
              if (!point) return null
              return (
                <Marker
                  key={`control-${index}`}
                  position={[point.lat, point.lon]}
                  icon={controlPointIcon}
                  draggable
                  eventHandlers={{
                    drag: (event: any) => {
                      const marker = event.target as L.Marker
                      const latlng = marker.getLatLng()
                      setDraftLine((prev) => {
                        if (!prev) return prev
                        const next = [...prev]
                        next[index] = { ...next[index], lat: latlng.lat, lon: latlng.lng }
                        return next
                      })
                    },
                  }}
                >
                  <Popup>轨迹控制点</Popup>
                </Marker>
              )
            })}

          {selectedWaypoint && typeof selectedWaypoint.lat === 'number' && typeof selectedWaypoint.lng === 'number' ? (
            <Marker position={[selectedWaypoint.lat, selectedWaypoint.lng]} icon={selectedWaypointIcon}>
              <Popup>{selectedWaypoint.name || '已定位途经点'}</Popup>
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
