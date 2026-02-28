# 自驾旅行复盘工具（开发中）

一个基于 React + TypeScript + Vite 的自驾旅行复盘原型，当前支持：
- 旅程/日期/路段录入与筛选
- 地图轨迹展示（OSRM 路网轨迹 + 失败回退直线）
- 起终点地名联想（Nominatim）
- 轨迹编辑（拖拽起点/终点，保存/取消）
- 途经点（Waypoints）展示与地图定位联动

## 本地运行

```bash
npm install
npm run dev
```

浏览器访问：<http://localhost:5173>

## 功能说明

### 1) 编辑轨迹（两个入口）

入口 A（占位区）：
- 在 `3) 地图占位区` 的“路段名称列表”中，点击某条路段右侧 `编辑轨迹`。

入口 B（地图区）：
- 在 `4) 地图轨迹` 右上角工具条点击 `编辑轨迹`。

编辑模式行为：
- 起点/终点 Marker 可拖拽。
- 拖拽时 Polyline 首尾点实时跟随。
- 点击 `取消`：回滚到进入编辑前状态。
- 点击 `保存`：写回当前数据（state + localStorage），刷新页面后仍可看到修改结果。

### 2) 途经点（Waypoints）展示与联动

在 `3) 地图占位区` 新增了 “途经点（Waypoints）” 小节：
- 显示途经点数量
- 列表展示：序号 + 经纬度（6位小数）+ timestamp（若有）
- 每条有 `定位` 按钮：点击后地图 `flyTo` 并高亮该点

途经点来源规则（优先级）：
1. 路段自带 `waypoints` 字段时，直接使用。
2. 否则使用路段 `points`（轨迹点）推导：去首尾后每隔 K 取 1 点。

默认参数：
- `K = 50`
- 最多展示 `20` 个

### 3) 起终点联想输入

在“为日期新增路段”表单中：
- 起点、终点为联想输入框（Nominatim Search）
- 选择候选后保存：
  - 简洁层级文本（省/市/县/镇）
  - 经纬度（`startCoord` / `endCoord`）
  - `startPlaceId` / `endPlaceId`
- 若只手工输入不选候选，则不写坐标；地图会 fallback 到 geocode。

## 数据存储说明

- 主数据存储在 localStorage：`trip-review-data-v1`
- 地理编码缓存：`geoCache_v1`
- 联想查询缓存：`nominatim_query_cache_v1`

清除或重置：
- 打开浏览器 DevTools -> Application -> Local Storage
- 删除上述 key 后刷新页面

## 开发提示

- 轨迹编辑保存时会同步写入：
  - `segment.startCoord`
  - `segment.endCoord`
  - `segment.points`
- 地图渲染优先使用已保存坐标；缺失时才 geocode。

## 常见问题

1) **拖拽后没变化 / 地图不刷新**
- 确认已进入编辑模式（右上角出现 `取消/保存`）。
- 确认拖拽的是起点或终点 Marker（S/E）。
- 拖拽后要点击 `保存` 才会持久化到 localStorage。

2) **waypoints 太多或太少**
- 调整 `src/App.tsx` 中：
  - `WAYPOINT_SAMPLE_STEP`（抽样间隔）
  - `WAYPOINT_MAX`（最大显示数）

3) **安装依赖失败（403）**
- 说明当前网络/镜像策略限制了 npm registry。
- 在可访问 npm registry 的环境执行 `npm install` 后再运行。
