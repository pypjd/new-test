import { useMemo, useState, type FormEvent } from 'react'
import type { RoutePreference, Trip } from '../types/trip'
import { routePreferenceOptions } from '../utils/routePreference'

interface TripEditorProps {
  trips: Trip[]
  onAddTrip: (payload: { title: string; startDate: string; endDate: string }) => void
  onAddDay: (payload: { tripId: string; date: string }) => void
  onAddSegment: (payload: {
    tripId: string
    dayId: string
    name: string
    startPoint: string
    endPoint: string
    viaPointsText: string
    preference: RoutePreference
  }) => void
}

// 旅程编辑区：集中提供“新增旅程 / 新增日期 / 新增路段”三个最小表单。
function TripEditor({ trips, onAddTrip, onAddDay, onAddSegment }: TripEditorProps) {
  const [tripTitle, setTripTitle] = useState('')
  const [tripStartDate, setTripStartDate] = useState('')
  const [tripEndDate, setTripEndDate] = useState('')

  const [dayTripId, setDayTripId] = useState('')
  const [dayDate, setDayDate] = useState('')

  const [segmentTripId, setSegmentTripId] = useState('')
  const [segmentDayId, setSegmentDayId] = useState('')
  const [segmentName, setSegmentName] = useState('')
  const [segmentStartPoint, setSegmentStartPoint] = useState('')
  const [segmentEndPoint, setSegmentEndPoint] = useState('')
  const [segmentViaPointsText, setSegmentViaPointsText] = useState('')
  const [segmentPreference, setSegmentPreference] = useState<RoutePreference>('HIGHWAY_FIRST')

  const daysForSelectedTrip = useMemo(() => {
    return trips.find((trip) => trip.id === segmentTripId)?.days ?? []
  }, [trips, segmentTripId])

  const handleAddTrip = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!tripTitle || !tripStartDate || !tripEndDate) return
    onAddTrip({ title: tripTitle, startDate: tripStartDate, endDate: tripEndDate })
    setTripTitle('')
    setTripStartDate('')
    setTripEndDate('')
  }

  const handleAddDay = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!dayTripId || !dayDate) return
    onAddDay({ tripId: dayTripId, date: dayDate })
    setDayDate('')
  }

  const handleAddSegment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!segmentTripId || !segmentDayId || !segmentName || !segmentStartPoint || !segmentEndPoint) return

    onAddSegment({
      tripId: segmentTripId,
      dayId: segmentDayId,
      name: segmentName,
      startPoint: segmentStartPoint,
      endPoint: segmentEndPoint,
      viaPointsText: segmentViaPointsText,
      preference: segmentPreference,
    })

    setSegmentName('')
    setSegmentStartPoint('')
    setSegmentEndPoint('')
    setSegmentViaPointsText('')
    setSegmentPreference('HIGHWAY_FIRST')
  }

  return (
    <section className="card-section">
      <h2>1) 旅程编辑区</h2>

      <form className="form-block" onSubmit={handleAddTrip}>
        <h3>新增旅程</h3>
        <input value={tripTitle} onChange={(e) => setTripTitle(e.target.value)} placeholder="旅程标题" />
        <input type="date" value={tripStartDate} onChange={(e) => setTripStartDate(e.target.value)} />
        <input type="date" value={tripEndDate} onChange={(e) => setTripEndDate(e.target.value)} />
        <button type="submit">添加旅程</button>
      </form>

      <form className="form-block" onSubmit={handleAddDay}>
        <h3>为旅程新增日期</h3>
        <select value={dayTripId} onChange={(e) => setDayTripId(e.target.value)}>
          <option value="">请选择旅程</option>
          {trips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.title}
            </option>
          ))}
        </select>
        <input type="date" value={dayDate} onChange={(e) => setDayDate(e.target.value)} />
        <button type="submit">添加日期</button>
      </form>

      <form className="form-block" onSubmit={handleAddSegment}>
        <h3>为日期新增路段</h3>
        <select
          value={segmentTripId}
          onChange={(e) => {
            const nextTripId = e.target.value
            setSegmentTripId(nextTripId)
            setSegmentDayId('')
          }}
        >
          <option value="">请选择旅程</option>
          {trips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.title}
            </option>
          ))}
        </select>

        <select value={segmentDayId} onChange={(e) => setSegmentDayId(e.target.value)}>
          <option value="">请选择日期</option>
          {daysForSelectedTrip.map((day) => (
            <option key={day.id} value={day.id}>
              {day.date}
            </option>
          ))}
        </select>

        <input value={segmentName} onChange={(e) => setSegmentName(e.target.value)} placeholder="路段名称" />
        <input
          value={segmentStartPoint}
          onChange={(e) => setSegmentStartPoint(e.target.value)}
          placeholder="起点"
        />
        <input value={segmentEndPoint} onChange={(e) => setSegmentEndPoint(e.target.value)} placeholder="终点" />
        <input
          value={segmentViaPointsText}
          onChange={(e) => setSegmentViaPointsText(e.target.value)}
          placeholder="途径点（逗号分隔）"
        />

        <select
          value={segmentPreference}
          onChange={(e) => setSegmentPreference(e.target.value as RoutePreference)}
        >
          {routePreferenceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="submit">添加路段</button>
      </form>
    </section>
  )
}

export default TripEditor
