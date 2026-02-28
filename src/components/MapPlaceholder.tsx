import PlaceAutocomplete from './PlaceAutocomplete'
import type { RouteSegment, RouteSummary, Waypoint } from '../types/trip'

interface FilterContext {
  tripName: string
  dayDate: string
  segmentName: string
}

interface MapPlaceholderProps {
  filteredSegments: RouteSegment[]
  summary: RouteSummary
  filterContext: FilterContext
  editingSegmentId: string | null
  activeSegmentId: string | null
  onEditSegment: (segmentId: string) => void
  waypoints: Waypoint[]
  onLocateWaypoint: (waypoint: Waypoint) => void
  waypointEditMode: boolean
  onStartWaypointEdit: () => void
  onCancelWaypointEdit: () => void
  onSaveWaypoints: () => void
  onAddWaypoint: () => void
  onUpdateWaypointName: (id: string, name: string) => void
  onSelectWaypointPlace: (id: string, payload: { label: string; lat: number; lon: number }) => void
  onMoveWaypoint: (id: string, direction: 'up' | 'down') => void
  onDeleteWaypoint: (id: string) => void
}

// 地图占位组件：展示筛选结果、路线级编辑入口与可编辑途经点。
function MapPlaceholder({
  filteredSegments,
  summary,
  filterContext,
  editingSegmentId,
  activeSegmentId,
  onEditSegment,
  waypoints,
  onLocateWaypoint,
  waypointEditMode,
  onStartWaypointEdit,
  onCancelWaypointEdit,
  onSaveWaypoints,
  onAddWaypoint,
  onUpdateWaypointName,
  onSelectWaypointPlace,
  onMoveWaypoint,
  onDeleteWaypoint,
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

        {!waypointEditMode ? (
          <button type="button" onClick={onStartWaypointEdit} disabled={!activeSegmentId}>
            编辑途经点
          </button>
        ) : (
          <div className="waypoint-actions">
            <button type="button" onClick={onAddWaypoint}>
              + 添加途经点
            </button>
            <button type="button" onClick={onSaveWaypoints}>
              保存途经点
            </button>
            <button type="button" onClick={onCancelWaypointEdit}>
              取消
            </button>
          </div>
        )}

        <ul className="waypoint-list">
          {waypoints.map((waypoint, index) => (
            <li key={waypoint.id} className="waypoint-item">
              <span>#{index + 1}</span>

              {waypointEditMode ? (
                <PlaceAutocomplete
                  valueText={waypoint.name}
                  onValueTextChange={(text) => onUpdateWaypointName(waypoint.id, text)}
                  onSelect={(result) => {
                    onSelectWaypointPlace(waypoint.id, {
                      label: result.label,
                      lat: result.lat,
                      lon: result.lon,
                    })
                  }}
                  placeholder="输入地名并选择候选"
                />
              ) : (
                <span>
                  {waypoint.name || '未命名途经点'}
                  {typeof waypoint.lat === 'number' && typeof waypoint.lon === 'number'
                    ? `（${waypoint.lat.toFixed(6)}, ${waypoint.lon.toFixed(6)}）`
                    : '（未解析坐标）'}
                  {waypoint.timestamp ? ` · ${waypoint.timestamp}` : ''}
                </span>
              )}

              <div className="waypoint-buttons">
                <button type="button" onClick={() => onMoveWaypoint(waypoint.id, 'up')} disabled={!waypointEditMode}>
                  上移
                </button>
                <button
                  type="button"
                  onClick={() => onMoveWaypoint(waypoint.id, 'down')}
                  disabled={!waypointEditMode}
                >
                  下移
                </button>
                <button type="button" onClick={() => onDeleteWaypoint(waypoint.id)} disabled={!waypointEditMode}>
                  删除
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof waypoint.lat !== 'number' || typeof waypoint.lon !== 'number') {
                      window.alert('未解析坐标，请先选择搜索结果。')
                      return
                    }
                    onLocateWaypoint(waypoint)
                  }}
                >
                  定位
                </button>
              </div>
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
