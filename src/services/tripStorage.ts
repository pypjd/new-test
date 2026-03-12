import { mockTripReview } from './mockData'
import type { RouteSegment, TripReview } from '../types/trip'

// 本地存储服务：统一处理 TripReview 的读取与保存，避免组件直接操作 localStorage。
const STORAGE_KEY = 'trip-review-data-v1'

function normalizeTripReview(input: TripReview): TripReview {
  return {
    ...input,
    trips: input.trips.map((trip) => ({
      ...trip,
      category: trip.category === 'plan' ? 'plan' : 'review',
      days: trip.days.map((day) => ({
        ...day,
        routeSegments: day.routeSegments.map((segment) => ({
          ...segment,
          routeType: segment.routeType ?? 'DRIVING',
          preference: segment.preference === 'AVOID_TOLL' ? 'AVOID_TOLL' : 'HIGHWAY_FIRST',
        })),
      })),
    })),
  }
}

function toPersistedRouteSegment(segment: RouteSegment): RouteSegment {
  return {
    id: segment.id,
    name: segment.name,
    date: segment.date,
    startPoint: segment.startPoint,
    endPoint: segment.endPoint,
    startCoord: segment.startCoord,
    endCoord: segment.endCoord,
    waypoints: segment.waypoints,
    routeType: segment.routeType ?? 'DRIVING',
    preference: segment.preference === 'AVOID_TOLL' ? 'AVOID_TOLL' : 'HIGHWAY_FIRST',
    distanceMeters: segment.distanceMeters,
    routeBuildKey: segment.routeBuildKey,
    // 兼容当前业务字段，避免刷新后表单信息丢失。
    viaPointsText: segment.viaPointsText,
    startPlaceId: segment.startPlaceId,
    endPlaceId: segment.endPlaceId,
    order: segment.order,
  }
}

export function toPersistedTripReview(data: TripReview): TripReview {
  return {
    trips: data.trips.map((trip) => ({
      ...trip,
      days: trip.days.map((day) => ({
        ...day,
        routeSegments: day.routeSegments.map((segment) => toPersistedRouteSegment(segment)),
      })),
    })),
  }
}

function resetToMockData(): TripReview {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersistedTripReview(mockTripReview)))
  } catch (error) {
    console.error('[tripStorage] Failed to reset trip review cache with mock data.', error)
  }
  return mockTripReview
}

export function loadTripReview(): TripReview {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return resetToMockData()
  }

  try {
    return normalizeTripReview(JSON.parse(raw) as TripReview)
  } catch (error) {
    console.error('[tripStorage] Failed to parse trip review cache, fallback to mock data.', error)
    return resetToMockData()
  }
}

export function saveTripReview(data: TripReview): void {
  try {
    const persisted = toPersistedTripReview(data)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  } catch (error) {
    console.error('[tripStorage] Failed to persist trip review into localStorage.', error)
  }
}
