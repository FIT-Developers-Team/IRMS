import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [basicSsl()],
  server: {
    proxy: {
      '/chart-query': {
        target: 'https://dash.astronauts.id',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/chart-query/, ''),
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
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          xlsx: ['xlsx'],
          scanner: ['html5-qrcode'],
          papaparse: ['papaparse'],
          gsap: ['gsap']
        }
      }
    }
  }
});
