import type { RouteSegment, RouteSummary } from '../types/trip'

interface FilterContext {
  tripName: string
  dayDate: string
  segmentName: string
}

interface WaypointItem {
  id: string
  lat: number
  lon: number
  timestamp?: string
}

interface MapPlaceholderProps {
  filteredSegments: RouteSegment[]
  summary: RouteSummary
  filterContext: FilterContext
  editingSegmentId: string | null
  activeSegmentId: string | null
  onEditSegment: (segmentId: string) => void
  waypoints: WaypointItem[]
  onLocateWaypoint: (waypoint: WaypointItem) => void
}

// 地图占位组件：展示筛选结果、路线级编辑入口和途经点列表。
function MapPlaceholder({
  filteredSegments,
  summary,
  filterContext,
  editingSegmentId,
  activeSegmentId,
  onEditSegment,
  waypoints,
  onLocateWaypoint,
}: MapPlaceholderProps) {
  return (
    <section className="card-section">
      <h2>3) 地图占位区</h2>

      <p>
        当前筛选：旅程【{filterContext.tripName}】 / 日期【{filterContext.dayDate}】 / 路段【
        {filterContext.segmentName}
        】
      </p>

      <p>当前筛选路段数量：{filteredSegments.length}</p>

      <p>路段名称列表：</p>
      <ul className="route-list">
        {filteredSegments.map((segment) => (
          <li key={segment.id} className={segment.id === activeSegmentId ? 'active' : ''}>
            <span>{segment.name}</span>
            <button type="button" onClick={() => onEditSegment(segment.id)}>
              {editingSegmentId === segment.id ? '编辑中' : '编辑轨迹'}
            </button>
          </li>
        ))}
      </ul>

      {filteredSegments.length === 0 && <p className="hint-text">当前筛选下暂无路段数据。</p>}

      <div className="waypoint-section">
        <p>途经点（Waypoints）</p>
        <p>途经点数量：{waypoints.length}</p>
        <ul className="waypoint-list">
          {waypoints.map((waypoint, index) => (
            <li key={waypoint.id}>
              <span>
                #{index + 1} {waypoint.lat.toFixed(6)}, {waypoint.lon.toFixed(6)}
                {waypoint.timestamp ? ` · ${waypoint.timestamp}` : ''}
              </span>
              <button type="button" onClick={() => onLocateWaypoint(waypoint)}>
                定位
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p>总里程：{summary.totalDistanceText}</p>
      <p>总时长：{summary.totalDurationText}</p>
      <p className="placeholder-tip">地图能力待接入（下一阶段接入地图 API）</p>
    </section>
  )
}

export default MapPlaceholder
