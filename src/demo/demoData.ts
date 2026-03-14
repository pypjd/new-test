import type { RouteSegment, TripReview } from '../types/trip'
import { buildSegmentRouteKey } from '../utils/routeBuildKey'

function withRouteBuildKey(segment: RouteSegment): RouteSegment {
  return {
    ...segment,
    routeBuildKey: buildSegmentRouteKey(segment),
  }
}

export const readonlyDemoTripReview: TripReview = {
  trips: [
    {
      id: 'demo-trip-1',
      title: '川西高原环线展示',
      category: 'review',
      order: 0,
      startDate: '2025-09-28',
      endDate: '2025-10-02',
      days: [
        {
          id: 'demo-day-1',
          date: '2025-09-28',
          routeSegments: [
            withRouteBuildKey({
              id: 'demo-seg-1',
              name: '成都 → 雅安',
              date: '2025-09-28',
              startPoint: '成都',
              endPoint: '雅安',
              startCoord: { lat: 30.572815, lon: 104.066801 },
              endCoord: { lat: 29.980537, lon: 103.013261 },
              routeType: 'DRIVING',
              preference: 'HIGHWAY_FIRST',
              distanceMeters: 136000,
              points: [
                { lat: 30.572815, lon: 104.066801 },
                { lat: 30.300021, lon: 103.867244 },
                { lat: 30.093915, lon: 103.490955 },
                { lat: 29.980537, lon: 103.013261 },
              ],
              waypoints: [{ id: 'demo-wp-1', name: '蒲江服务区', lat: 30.19863, lng: 103.5112 }],
            }),
          ],
        },
        {
          id: 'demo-day-2',
          date: '2025-09-29',
          routeSegments: [
            withRouteBuildKey({
              id: 'demo-seg-2',
              name: '雅安 → 康定',
              date: '2025-09-29',
              startPoint: '雅安',
              endPoint: '康定',
              startCoord: { lat: 29.980537, lon: 103.013261 },
              endCoord: { lat: 30.049795, lon: 101.964058 },
              routeType: 'DRIVING',
              preference: 'HIGHWAY_FIRST',
              distanceMeters: 204000,
              points: [
                { lat: 29.980537, lon: 103.013261 },
                { lat: 29.760613, lon: 102.163486 },
                { lat: 29.910412, lon: 102.228394 },
                { lat: 30.049795, lon: 101.964058 },
              ],
              waypoints: [{ id: 'demo-wp-2', name: '泸定桥', lat: 29.9148, lng: 102.2334 }],
            }),
          ],
        },
      ],
    },
    {
      id: 'demo-trip-2',
      title: '浙东海岸轻松自驾',
      category: 'plan',
      order: 0,
      startDate: '2025-04-14',
      endDate: '2025-04-16',
      days: [
        {
          id: 'demo-day-3',
          date: '2025-04-14',
          routeSegments: [
            withRouteBuildKey({
              id: 'demo-seg-3',
              name: '宁波 → 象山石浦',
              date: '2025-04-14',
              startPoint: '宁波',
              endPoint: '石浦渔港古城',
              startCoord: { lat: 29.868336, lon: 121.54399 },
              endCoord: { lat: 29.201687, lon: 121.944214 },
              routeType: 'DRIVING',
              preference: 'AVOID_TOLL',
              distanceMeters: 103000,
              points: [
                { lat: 29.868336, lon: 121.54399 },
                { lat: 29.666117, lon: 121.818977 },
                { lat: 29.450021, lon: 121.916341 },
                { lat: 29.201687, lon: 121.944214 },
              ],
            }),
          ],
        },
      ],
    },
  ],
}
