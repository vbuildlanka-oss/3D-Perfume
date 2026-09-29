import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    // three + drei + postprocessing are heavy; split them out of the app chunk
    // so the DOM loading screen can paint before the WebGL payload arrives.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
          gsap: ['gsap'],
        },
      },
    },
    chunkSizeWarningLimit: 1600,
  },
});
