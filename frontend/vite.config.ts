import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      '.trycloudflare.com',
      'multimedia-blackberry-traditional-kenneth.trycloudflare.com',
      'camel-cam-gathering-mother.trycloudflare.com',
      'billion-electron-humor-coverage.trycloudflare.com',
      'cuts-midwest-specifically-female.trycloudflare.com',
      'wisdom-adjusted-nevertheless-tail.trycloudflare.com',
      'localhost',
      '127.0.0.1',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
