import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite 配置入口：后续可在这里添加路径别名、代理、打包优化等设置。
export default defineConfig({
  plugins: [react()],
})
