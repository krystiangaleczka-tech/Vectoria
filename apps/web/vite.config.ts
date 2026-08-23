import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@vectoria/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@vectoria/core': path.resolve(__dirname, '../../packages/core/src'),
      '@vectoria/editor-engine': path.resolve(__dirname, '../../packages/editor-engine/src'),
      '@vectoria/renderer': path.resolve(__dirname, '../../packages/renderer/src'),
      '@vectoria/io': path.resolve(__dirname, '../../packages/io/src'),
      '@vectoria/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
