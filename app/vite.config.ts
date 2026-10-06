import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    // Lets a launcher pick a free port; defaults to Vite's usual 5173.
    port: Number(process.env.PORT) || 5173,
  },
});
