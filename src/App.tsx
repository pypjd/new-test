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

      <MapPlaceholder filteredSegments={filteredSegments} summary={summary} />
    </main>
  )
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

export default App
