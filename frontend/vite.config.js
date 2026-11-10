import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// in dev the react app runs on 5173 and forwards backend calls to express on 3000,
// so the browser sees one origin and the login cookie just works
const backend = process.env.BACKEND_URL || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/auth': backend,
      '/health': backend,
      '/ws': { target: backend.replace('http', 'ws'), ws: true }
    }
  }
});