import { useEffect, useMemo, useState } from 'react'
import FilterPanel from './components/FilterPanel'
import MapPlaceholder from './components/MapPlaceholder'
import TripEditor from './components/TripEditor'
import { useFilteredSegments } from './hooks/useFilteredSegments'
import { loadTripReview, saveTripReview } from './services/tripStorage'
import type { FilterState, RoutePreference, RouteSummary, TripReview } from './types/trip'
import './styles/app.css'

// 根组件：组装数据状态、编辑动作、筛选状态与地图占位展示。
function App() {
  const [tripReview, setTripReview] = useState<TripReview>(() => loadTripReview())
  const [filters, setFilters] = useState<FilterState>({ tripId: '', dayId: '', segmentId: '' })

  useEffect(() => {
    // 数据变化后自动持久化：新增旅程/日期/路段后刷新页面仍可恢复。
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

  const addDay = (payload: { tripId: string; date: string }) => {
    setTripReview((prev) => ({
      trips: prev.trips.map((trip) => {
        if (trip.id !== payload.tripId) return trip
        return {
          ...trip,
          days: [
            ...trip.days,
            {
              id: createId('day'),
              date: payload.date,
              routeSegments: [],
            },
          ],
        }
      }),
    }))
  }

  const addSegment = (payload: {
    tripId: string
    dayId: string
    name: string
    startPoint: string
    endPoint: string
    viaPointsText: string
    preference: RoutePreference
  }) => {
    setTripReview((prev) => ({
      trips: prev.trips.map((trip) => {
        if (trip.id !== payload.tripId) return trip
        return {
          ...trip,
          days: trip.days.map((day) => {
            if (day.id !== payload.dayId) return day
            return {
              ...day,
              routeSegments: [
                ...day.routeSegments,
                {
                  id: createId('segment'),
                  name: payload.name,
                  startPoint: payload.startPoint,
                  endPoint: payload.endPoint,
                  viaPointsText: payload.viaPointsText,
                  preference: payload.preference,
                },
              ],
            }
          }),
        }
      }),
    }))
  }

  return (
    <main className="app-shell">
      <h1>自驾旅行复盘工具（开发中）</h1>

      <TripEditor trips={tripReview.trips} onAddTrip={addTrip} onAddDay={addDay} onAddSegment={addSegment} />

      <FilterPanel trips={tripReview.trips} filters={filters} onChange={setFilters} />

      <MapPlaceholder filteredSegments={filteredSegments} summary={summary} filterContext={filterContext} />
    </main>
  )
}

// 简易 ID 生成器：用于前端原型阶段快速创建唯一标识。
function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

export default App
