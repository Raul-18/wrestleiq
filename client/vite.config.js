import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy API + uploaded media to Express so the React dev server and backend share one browser origin for the <video> element
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
