import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// During development, every call to /api is forwarded to the Spring Boot backend on :8080.
// So the frontend can call "/api/..." without CORS problems.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8080' },
  },
})
