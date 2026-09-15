import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CloudBase Web 托管挂在域名根路径，资源应为 /assets/... 而非 /chat/assets/...
export default defineConfig({
  plugins: [react()],
  base: '/',
})
