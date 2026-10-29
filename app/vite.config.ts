import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // relative paths: works at https://<user>.github.io/<repo>/
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
