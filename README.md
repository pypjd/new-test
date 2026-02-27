# 自驾旅行复盘与路线重建工具（前端骨架）

这是一个面向新手的 React + TypeScript + Vite 初始化项目。

## 1) 推荐初始化命令（npm）

```bash
npm create vite@latest roadtrip-retrospective-tool -- --template react-ts
cd roadtrip-retrospective-tool
npm install
npm run dev
```

> 如果你想直接在当前目录创建项目：

```bash
npm create vite@latest . -- --template react-ts
```

## 2) 建议目录结构（`src`）

```text
src/
├─ App.tsx              # 根组件（页面入口内容）
├─ main.tsx             # 应用挂载入口
├─ styles/
│  ├─ global.css        # 全局样式
│  └─ app.css           # 页面级样式
├─ pages/               # 页面级组件（按路由/场景）
├─ components/          # 可复用 UI 组件
├─ services/            # 数据服务层（本地存储/API）
├─ store/               # 全局状态（可选）
├─ hooks/               # 自定义 Hook
├─ utils/               # 工具函数
└─ types/               # 类型定义
```

## 3) 当前最简骨架说明

- 页面会显示标题：**自驾旅行复盘工具（开发中）**。
- 关键文件均有注释，便于新手理解职责。
- 已预留后续接入地图组件和本地存储的目录。

## 4) 运行命令

```bash
npm install
npm run dev
```

## 5) 可选检查命令

```bash
npm run build
```
