import { useMemo } from 'react'
import type { FilterState, Trip } from '../types/trip'

interface FilterPanelProps {
  trips: Trip[]
  filters: FilterState
  onChange: (next: FilterState) => void
}

// 筛选区：按“旅程 / 日期 / 路段”逐级筛选，便于复盘时缩小查看范围。
function FilterPanel({ trips, filters, onChange }: FilterPanelProps) {
  const selectedTrip = trips.find((trip) => trip.id === filters.tripId)

  const dayOptions = useMemo(() => {
    return selectedTrip?.days ?? []
  }, [selectedTrip])

  const segmentOptions = useMemo(() => {
    const selectedDay = dayOptions.find((day) => day.id === filters.dayId)
    return selectedDay?.routeSegments ?? []
  }, [dayOptions, filters.dayId])

  return (
    <section className="card-section">
      <h2>2) 筛选区</h2>

      <div className="filter-row">
        <label>
          旅程
          <select
            value={filters.tripId}
            onChange={(e) => onChange({ tripId: e.target.value, dayId: '', segmentId: '' })}
          >
            <option value="">全部旅程</option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          日期
          <select
            value={filters.dayId}
            onChange={(e) => onChange({ ...filters, dayId: e.target.value, segmentId: '' })}
            disabled={!filters.tripId}
          >
            <option value="">全部日期</option>
            {dayOptions.map((day) => (
              <option key={day.id} value={day.id}>
                {day.date}
              </option>
            ))}
          </select>
        </label>

        <label>
          路段
          <select
            value={filters.segmentId}
            onChange={(e) => onChange({ ...filters, segmentId: e.target.value })}
            disabled={!filters.dayId}
          >
            <option value="">全部路段</option>
            {segmentOptions.map((segment) => (
              <option key={segment.id} value={segment.id}>
                {segment.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}

export default FilterPanel
