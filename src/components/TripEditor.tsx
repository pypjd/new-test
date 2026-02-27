import { useMemo, useState, type FormEvent } from 'react'
import type { RoutePreference, Trip } from '../types/trip'
import { routePreferenceOptions } from '../utils/routePreference'
import { eachDayInRange } from '../utils/date'

interface TripEditorProps {
  trips: Trip[]
  onAddTrip: (payload: { title: string; startDate: string; endDate: string }) => void
  onAddSegment: (payload: {
    tripId: string
    dayDate: string
    name: string
    startPoint: string
    endPoint: string
    viaPointsText: string
    preference: RoutePreference
  }) => void
}

// 旅程编辑区：仅保留“新增旅程 / 为日期新增路段”，日期选项由旅程起止日期动态生成。
function TripEditor({ trips, onAddTrip, onAddSegment }: TripEditorProps) {
  const [tripTitle, setTripTitle] = useState('')
  const [tripStartDate, setTripStartDate] = useState('')
  const [tripEndDate, setTripEndDate] = useState('')
  const [tripError, setTripError] = useState('')

  const [segmentTripId, setSegmentTripId] = useState('')
  const [segmentDayDate, setSegmentDayDate] = useState('')
  const [segmentName, setSegmentName] = useState('')
  const [segmentStartPoint, setSegmentStartPoint] = useState('')
  const [segmentEndPoint, setSegmentEndPoint] = useState('')
  const [segmentViaPointsText, setSegmentViaPointsText] = useState('')
  const [segmentPreference, setSegmentPreference] = useState<RoutePreference>('HIGHWAY_FIRST')
  const [segmentError, setSegmentError] = useState('')

  const dateOptions = useMemo(() => {
    const selectedTrip = trips.find((trip) => trip.id === segmentTripId)
    if (!selectedTrip) return []
    return eachDayInRange(selectedTrip.startDate, selectedTrip.endDate)
  }, [trips, segmentTripId])

  const handleAddTrip = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTripError('')

    if (!tripTitle.trim() || !tripStartDate || !tripEndDate) {
      setTripError('请填写旅程标题、开始日期、结束日期。')
      return
    }

    if (new Date(`${tripStartDate}T00:00:00`) > new Date(`${tripEndDate}T00:00:00`)) {
      setTripError('开始日期不能晚于结束日期。')
      return
    }

    onAddTrip({ title: tripTitle.trim(), startDate: tripStartDate, endDate: tripEndDate })
    setTripTitle('')
    setTripStartDate('')
    setTripEndDate('')
  }

  const handleAddSegment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSegmentError('')

    if (!segmentTripId) {
      setSegmentError('请先选择旅程')
      return
    }

    if (!segmentDayDate) {
      setSegmentError('请先选择日期。')
      return
    }

    if (!segmentName.trim() || !segmentStartPoint.trim() || !segmentEndPoint.trim()) {
      setSegmentError('请填写路段名称、起点、终点。')
      return
    }

    onAddSegment({
      tripId: segmentTripId,
      dayDate: segmentDayDate,
      name: segmentName.trim(),
      startPoint: segmentStartPoint.trim(),
      endPoint: segmentEndPoint.trim(),
      viaPointsText: segmentViaPointsText.trim(),
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
        {tripError && <p className="error-text">{tripError}</p>}
      </form>

      <form className="form-block" onSubmit={handleAddSegment}>
        <h3>为日期新增路段</h3>
        <select
          value={segmentTripId}
          onChange={(e) => {
            const nextTripId = e.target.value
            setSegmentTripId(nextTripId)
            setSegmentDayDate('')
          }}
        >
          <option value="">请选择旅程</option>
          {trips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.title}
            </option>
          ))}
        </select>

        <select
          value={segmentDayDate}
          onChange={(e) => setSegmentDayDate(e.target.value)}
          disabled={!segmentTripId}
        >
          <option value="">请选择日期</option>
          {dateOptions.map((date) => (
            <option key={date} value={date}>
              {date}
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

        <button type="submit" disabled={!segmentTripId || !segmentDayDate || !segmentName.trim()}>
          添加路段
        </button>
        {!segmentTripId && <p className="hint-text">请先选择旅程</p>}
        {segmentError && <p className="error-text">{segmentError}</p>}
      </form>
    </section>
  )
}

export default TripEditor
