import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages base: set VITE_BASE in the workflow to "/<repo-name>/"
// Locally defaults to "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/',
  server: {
    proxy: {
      // client.projectgorgon.com does not send CORS headers — proxy it in dev.
      '/pgversion': {
        target: 'https://client.projectgorgon.com',
        changeOrigin: true,
        rewrite: () => '/fileversion.txt',
      },
      '/ge-api': {
        target: 'https://api.gorgonexplorer.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ge-api/, '/api'),
        headers: {
          // GE's backend 403s requests missing these — spoof a normal browser visit.
          Referer: 'https://gorgonexplorer.com/',
          Origin: 'https://gorgonexplorer.com',
          Accept: 'application/json, text/plain, */*',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
      },
    },
  },
});
