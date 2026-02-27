# 自驾旅行复盘工具（第1轮骨架）

基于 React + TypeScript + Vite 的新手友好项目。

## 安装与运行

```bash
npm install
npm run dev
```

## 第1轮已实现能力

- 新建旅程（标题、开始日期、结束日期）
- 在旅程下新增日期
- 在某个日期下新增多个路段
- 按旅程 / 日期 / 路段筛选
- 地图占位区展示筛选后的路段数量与名称
- localStorage 自动保存与恢复
- localStorage 为空时自动注入假数据

## 目录说明（src）

- `types/trip.ts`：核心类型定义（Trip / TripDay / RouteSegment / RouteSummary）
- `services/mockData.ts`：假数据
- `services/tripStorage.ts`：localStorage 读写
- `hooks/useFilteredSegments.ts`：筛选计算逻辑
- `components/TripEditor.tsx`：编辑区
- `components/FilterPanel.tsx`：筛选区
- `components/MapPlaceholder.tsx`：地图占位区
