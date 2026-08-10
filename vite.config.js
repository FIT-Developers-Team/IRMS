import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/superset-api': {
        target: 'https://dash.astronauts.id',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/superset-api/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const customCookie = req.headers['x-superset-cookie'];
            if (customCookie) {
              proxyReq.setHeader('Cookie', customCookie);
            }
          });
        }
      }
    }
  }
});
