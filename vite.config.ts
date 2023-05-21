import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  server: { fs: { allow: ['..'] } },
  base: '/shader-graph-wgsl/',
  plugins: [react()],
});
