import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: [
        'src/app/api/**/route.js',
        'src/lib/auth/server-auth.js',
        'src/lib/auth/passwords.js',
      ],
      exclude: [
        'src/**/*.test.js',
      ],
      thresholds: {
        statements: 70,
        lines: 70,
        branches: 60,
        functions: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
});
