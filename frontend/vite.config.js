import { defineConfig } from 'vite';

const apiProxyTarget = process.env.VITE_DEV_API_PROXY_TARGET || 'http://localhost:3001';

export default defineConfig({
  server: {
    proxy: {
      '/api': apiProxyTarget,
    },
  },
});
