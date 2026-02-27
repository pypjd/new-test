import type { RouteSegment, RouteSummary } from '../types/trip'

interface MapPlaceholderProps {
  filteredSegments: RouteSegment[]
  summary: RouteSummary
}

// 地图占位组件：第1轮仅展示筛选结果和汇总占位信息，不接真实地图 API。
function MapPlaceholder({ filteredSegments, summary }: MapPlaceholderProps) {
  return (
    <section className="card-section">
      <h2>3) 地图占位区</h2>
      <p>当前筛选路段数量：{filteredSegments.length}</p>

      <p>路段名称列表：</p>
      <ul>
        {filteredSegments.map((segment) => (
          <li key={segment.id}>{segment.name}</li>
        ))}
      </ul>

      <p>总里程：{summary.totalDistanceText}</p>
      <p>总时长：{summary.totalDurationText}</p>
      <p className="placeholder-tip">地图能力待接入（下一阶段接入地图 API）</p>
    </section>
  )
}

export default MapPlaceholder
