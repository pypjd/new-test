import { useEffect, useMemo, useState } from 'react'
import FilterPanel from './components/FilterPanel'
import MapPlaceholder from './components/MapPlaceholder'
import MapPanel from './components/MapPanel'
import TripEditor from './components/TripEditor'
import { useFilteredSegments } from './hooks/useFilteredSegments'
import { loadTripReview, saveTripReview } from './services/tripStorage'
import type {
  CoordPoint,
  FilterState,
  RoutePreference,
  RouteSegment,
  RouteSummary,
  TripReview,
  Waypoint,
} from './types/trip'
import './styles/app.css'

const WAYPOINT_SAMPLE_STEP = 50
const WAYPOINT_MAX = 20

// 根组件：组装数据状态、编辑动作、筛选状态、占位区与地图轨迹联动。
function App() {
  const [tripReview, setTripReview] = useState<TripReview>(() => loadTripReview())
  const [filters, setFilters] = useState<FilterState>({ tripId: '', dayId: '', segmentId: '' })
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null)
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null)
  const [segmentTrackPoints, setSegmentTrackPoints] = useState<Record<string, CoordPoint[]>>({})

  const [editingWaypointSegmentId, setEditingWaypointSegmentId] = useState<string | null>(null)
  const [waypointDrafts, setWaypointDrafts] = useState<Waypoint[]>([])

  useEffect(() => {
    // 数据变化后自动持久化：新增旅程/日期/路段和编辑轨迹后刷新页面仍可恢复。
    saveTripReview(tripReview)
  }, [tripReview])

  const filteredSegments = useFilteredSegments(tripReview.trips, filters)

  const summary: RouteSummary = useMemo(
    () => ({
      totalDistanceText: '待生成',
      totalDurationText: '待生成',
    }),
    [],
  )

  const filterContext = useMemo(() => {
    const selectedTrip = tripReview.trips.find((trip) => trip.id === filters.tripId)
    const selectedDay = selectedTrip?.days.find((day) => day.id === filters.dayId)
    const selectedSegment = selectedDay?.routeSegments.find((segment) => segment.id === filters.segmentId)

    return {
      tripName: selectedTrip?.title ?? '全部旅程',
      dayDate: selectedDay?.date ?? '全部日期',
      segmentName: selectedSegment?.name ?? '全部路段',
    }
  }, [tripReview.trips, filters.tripId, filters.dayId, filters.segmentId])

  const activeSegmentId = useMemo(() => {
    if (editingSegmentId && filteredSegments.some((segment) => segment.id === editingSegmentId)) {
      return editingSegmentId
    }
    return filteredSegments[0]?.id ?? null
  }, [filteredSegments, editingSegmentId])

  const activeSegment = useMemo(
    () => filteredSegments.find((segment) => segment.id === activeSegmentId) ?? null,
    [filteredSegments, activeSegmentId],
  )

  const displayedWaypoints = useMemo<Waypoint[]>(() => {
    if (!activeSegment) return []

    if (activeSegment.waypoints?.length) {
      return activeSegment.waypoints
    }

    const sourcePoints = activeSegment.points?.length
      ? activeSegment.points
      : (segmentTrackPoints[activeSegment.id] ?? [])

    if (sourcePoints.length <= 2) return []

    return sourcePoints
      .slice(1, -1)
      .filter((_, index) => index % WAYPOINT_SAMPLE_STEP === 0)
      .slice(0, WAYPOINT_MAX)
      .map((point, index) => ({
        id: `wp-${activeSegment.id}-${index}`,
        name: `途经点 ${index + 1}`,
        lat: point.lat,
        lon: point.lon,
        timestamp: point.timestamp,
      }))
  }, [activeSegment, segmentTrackPoints])

  const selectedWaypoint = useMemo(() => {
    const source = editingWaypointSegmentId === activeSegmentId ? waypointDrafts : displayedWaypoints
    return source.find((waypoint) => waypoint.id === selectedWaypointId) ?? null
  }, [displayedWaypoints, editingWaypointSegmentId, activeSegmentId, waypointDrafts, selectedWaypointId])

  const addTrip = (payload: { title: string; startDate: string; endDate: string }) => {
    setTripReview((prev) => ({
      trips: [
        ...prev.trips,
        {
          id: createId('trip'),
          title: payload.title,
          startDate: payload.startDate,
          endDate: payload.endDate,
          days: [],
        },
      ],
    }))
  }

  const addSegment = (payload: {
    tripId: string
    dayDate: string
    name: string
    startPoint: string
    endPoint: string
    viaPointsText: string
    preference: RoutePreference
    startCoord?: CoordPoint
    endCoord?: CoordPoint
    startPlaceId?: string
    endPlaceId?: string
  }) => {
    setTripReview((prev) => ({
      trips: prev.trips.map((trip) => {
        if (trip.id !== payload.tripId) return trip

        const matchedDay = trip.days.find((day) => day.date === payload.dayDate)
        const nextSegment: RouteSegment = {
          id: createId('segment'),
          name: payload.name,
          startPoint: payload.startPoint,
          endPoint: payload.endPoint,
          viaPointsText: payload.viaPointsText,
          preference: payload.preference,
          startCoord: payload.startCoord,
          endCoord: payload.endCoord,
          startPlaceId: payload.startPlaceId,
          endPlaceId: payload.endPlaceId,
        }

        if (!matchedDay) {
          return {
            ...trip,
            days: [
              ...trip.days,
              {
                id: payload.dayDate,
                date: payload.dayDate,
                routeSegments: [nextSegment],
              },
            ],
          }
        }

        return {
          ...trip,
          days: trip.days.map((day) => {
            if (day.date !== payload.dayDate) return day
            return {
              ...day,
              routeSegments: [...day.routeSegments, nextSegment],
            }
          }),
        }
      }),
    }))
  }

  const saveSegmentTrack = (payload: {
    segmentId: string
    startCoord: CoordPoint
    endCoord: CoordPoint
    points: CoordPoint[]
  }) => {
    setTripReview((prev) => ({
      trips: prev.trips.map((trip) => ({
        ...trip,
        days: trip.days.map((day) => ({
          ...day,
          routeSegments: day.routeSegments.map((segment) => {
            if (segment.id !== payload.segmentId) return segment
            return {
              ...segment,
              startCoord: payload.startCoord,
              endCoord: payload.endCoord,
              points: payload.points,
            }
          }),
        })),
      })),
    }))
    setEditingSegmentId(null)
  }

  const startWaypointEdit = (segmentId: string) => {
    const target = filteredSegments.find((segment) => segment.id === segmentId)
    setEditingWaypointSegmentId(segmentId)
    setWaypointDrafts([...(target?.waypoints ?? displayedWaypoints)])
  }

  const saveWaypoints = () => {
    if (!editingWaypointSegmentId) return

    setTripReview((prev) => ({
      trips: prev.trips.map((trip) => ({
        ...trip,
        days: trip.days.map((day) => ({
          ...day,
          routeSegments: day.routeSegments.map((segment) => {
            if (segment.id !== editingWaypointSegmentId) return segment
            return {
              ...segment,
              waypoints: waypointDrafts,
            }
          }),
        })),
      })),
    }))

    setEditingWaypointSegmentId(null)
    setWaypointDrafts([])
  }

  return (
    <main className="app-shell">
      <h1>自驾旅行复盘工具（开发中）</h1>

      <TripEditor trips={tripReview.trips} onAddTrip={addTrip} onAddSegment={addSegment} />

      <FilterPanel trips={tripReview.trips} filters={filters} onChange={setFilters} />

      <MapPlaceholder
        filteredSegments={filteredSegments}
        summary={summary}
        filterContext={filterContext}
        editingSegmentId={editingSegmentId}
        activeSegmentId={activeSegmentId}
        onEditSegment={(segmentId) => setEditingSegmentId(segmentId)}
        waypoints={editingWaypointSegmentId === activeSegmentId ? waypointDrafts : displayedWaypoints}
        onLocateWaypoint={(waypoint) => setSelectedWaypointId(waypoint.id)}
        waypointEditMode={editingWaypointSegmentId === activeSegmentId}
        onStartWaypointEdit={() => {
          if (activeSegmentId) startWaypointEdit(activeSegmentId)
        }}
        onCancelWaypointEdit={() => {
          setEditingWaypointSegmentId(null)
          setWaypointDrafts([])
        }}
        onSaveWaypoints={saveWaypoints}
        onAddWaypoint={() => {
          setWaypointDrafts((prev) => [...prev, { id: createId('wp'), name: '' }])
        }}
        onUpdateWaypointName={(id, name) => {
          setWaypointDrafts((prev) =>
            prev.map((item) => (item.id === id ? { ...item, name, lat: undefined, lon: undefined } : item)),
          )
        }}
        onSelectWaypointPlace={(id, payload) => {
          setWaypointDrafts((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, name: payload.label, lat: payload.lat, lon: payload.lon } : item,
            ),
          )
        }}
        onMoveWaypoint={(id, direction) => {
          setWaypointDrafts((prev) => {
            const idx = prev.findIndex((item) => item.id === id)
            if (idx < 0) return prev
            const target = direction === 'up' ? idx - 1 : idx + 1
            if (target < 0 || target >= prev.length) return prev
            const cloned = [...prev]
            const [item] = cloned.splice(idx, 1)
            cloned.splice(target, 0, item)
            return cloned
          })
        }}
        onDeleteWaypoint={(id) => {
          setWaypointDrafts((prev) => prev.filter((item) => item.id !== id))
        }}
      />

      <MapPanel
        filteredSegments={filteredSegments}
        filters={filters}
        editingSegmentId={editingSegmentId}
        onStartEdit={(segmentId) => setEditingSegmentId(segmentId)}
        onCancelEdit={() => setEditingSegmentId(null)}
        onSaveEdit={saveSegmentTrack}
        selectedWaypoint={selectedWaypoint}
        onTracksComputed={setSegmentTrackPoints}
      />
    </main>
  )
}

// 简易 ID 生成器：用于前端原型阶段快速创建唯一标识。
function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

export default App
