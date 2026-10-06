import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'backend',
          // convex-test runs functions in the same runtime Convex uses.
          environment: 'edge-runtime',
          include: ['convex/**/*.test.ts', 'shared/**/*.test.ts'],
          server: { deps: { inline: ['convex-test'] } },
        },
      },
      {
        extends: true,
        test: {
          name: 'frontend',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/test/setup.ts'],
          globals: true,
        },
      },
    ],
  },
});
