import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    port: 5174, // keep your dev port
    proxy: {
      // Proxy any request starting with /api to your backend
      // This avoids CORS in development by forwarding requests server-side.
      "/api": {
        target: "http://localhost:8081",
        changeOrigin: true,
        secure: false,
        // keep the /api prefix — backend expects /api/...
        rewrite: (path) => path,
      },
    },
  },
})
