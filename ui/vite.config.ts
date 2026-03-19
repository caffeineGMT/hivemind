import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.GITHUB_PAGES === 'true' ? '/hivemind/' : '/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-recharts': ['recharts'],
          'vendor-d3': ['d3'],
          'vendor-flow': ['reactflow', 'dagre'],
          'vendor-icons': ['lucide-react'],
          'vendor-utils': ['date-fns', 'clsx'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
    target: 'esnext',
    minify: 'esbuild',
  },
});
