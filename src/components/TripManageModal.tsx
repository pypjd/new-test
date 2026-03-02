import { useMemo, useState } from 'react'
import type { Trip } from '../types/trip'

interface TripManageModalProps {
  open: boolean
  trips: Trip[]
  onClose: () => void
  onDeleteTrip: (tripId: string) => void
  onMoveTrip: (tripId: string, direction: 'up' | 'down') => void
  onReorderTrips: (orderedTripIds: string[]) => void
}

function segmentCountOfTrip(trip: Trip): number {
  return trip.days.reduce((sum, day) => sum + day.routeSegments.length, 0)
}

function TripManageModal({
  open,
  trips,
  onClose,
  onDeleteTrip,
  onMoveTrip,
  onReorderTrips,
}: TripManageModalProps) {
  const [draggingTripId, setDraggingTripId] = useState<string | null>(null)

  const sortedTrips = useMemo(() => trips, [trips])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>管理旅程</h3>
        <p className="hint-text">支持拖拽排序，也可使用上移/下移按钮。</p>

        <ul className="trip-manage-list">
          {sortedTrips.map((trip, index) => {
            const segmentCount = segmentCountOfTrip(trip)

            return (
              <li
                key={trip.id}
                className="trip-manage-item"
                draggable
                onDragStart={() => setDraggingTripId(trip.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (!draggingTripId || draggingTripId === trip.id) return
                  const orderedIds = [...sortedTrips.map((item) => item.id)]
                  const from = orderedIds.findIndex((id) => id === draggingTripId)
                  const to = orderedIds.findIndex((id) => id === trip.id)
                  if (from < 0 || to < 0) return
                  const [moved] = orderedIds.splice(from, 1)
                  orderedIds.splice(to, 0, moved)
                  onReorderTrips(orderedIds)
                  setDraggingTripId(null)
                }}
                onDragEnd={() => setDraggingTripId(null)}
              >
                <div className="trip-main-meta">
                  <strong>{trip.title}</strong>
                  <small>
                    {trip.startDate} ~ {trip.endDate} · {segmentCount} 条路段
                  </small>
                </div>

                <div className="trip-item-actions">
                  <button type="button" onClick={() => onMoveTrip(trip.id, 'up')} disabled={index === 0}>
                    上移
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveTrip(trip.id, 'down')}
                    disabled={index === sortedTrips.length - 1}
                  >
                    下移
                  </button>
                  <button type="button" className="danger-btn" onClick={() => onDeleteTrip(trip.id)}>
                    删除
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="modal-footer">
          <button type="button" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>
  )
}

export default TripManageModal
