import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // Stable vendor chunks: framework, animation, and data layers
        // change at different rates, so repeat visits re-download less.
        // No new dependencies — just a caching layout for existing ones.
        manualChunks: {
          vendor_react: ['react', 'react-dom', 'react-router-dom'],
          vendor_motion: ['framer-motion'],
          vendor_data: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
