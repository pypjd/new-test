import type { RouteSegment, RouteSummary } from '../types/trip'

interface FilterContext {
  tripName: string
  dayDate: string
  segmentName: string
}

interface MapPlaceholderProps {
  filteredSegments: RouteSegment[]
  summary: RouteSummary
  filterContext: FilterContext
}

// 地图占位组件：第1轮修正中补充筛选上下文显示，仍不接真实地图 API。
function MapPlaceholder({ filteredSegments, summary, filterContext }: MapPlaceholderProps) {
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
      <ul>
        {filteredSegments.map((segment) => (
          <li key={segment.id}>{segment.name}</li>
        ))}
      </ul>

      {filteredSegments.length === 0 && <p className="hint-text">当前筛选下暂无路段数据。</p>}

      <p>总里程：{summary.totalDistanceText}</p>
      <p>总时长：{summary.totalDurationText}</p>
      <p className="placeholder-tip">地图能力待接入（下一阶段接入地图 API）</p>
    </section>
  )
}

export default MapPlaceholder
