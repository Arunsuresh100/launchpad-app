import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/scan-resume': 'http://127.0.0.1:8000',
      '/search_jobs': 'http://127.0.0.1:8000',
      '/contact': 'http://127.0.0.1:8000',
      '/login': 'http://127.0.0.1:8000',
      '/register': 'http://127.0.0.1:8000',
      '/auth': 'http://127.0.0.1:8000',
      '/admin': 'http://127.0.0.1:8000',
      '/update_profile': 'http://127.0.0.1:8000',
      '/change_password': 'http://127.0.0.1:8000',
      '/ats_check': 'http://127.0.0.1:8000',
      '/system': 'http://127.0.0.1:8000',
    }
  }
})
