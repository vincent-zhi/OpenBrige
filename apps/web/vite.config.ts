import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:7443',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:7443',
        ws: true,
      },
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
});
