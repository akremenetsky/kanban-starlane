import path from 'path';
import { defineConfig } from 'vitest/config';

const fake = (name: string) => path.resolve(import.meta.dirname, 'tests/setup/fakes', `${name}.ts`);

export default defineConfig({
  resolve: {
    alias: [
      { find: /^src\//, replacement: path.resolve(import.meta.dirname, 'src') + '/' },
      // The real `obsidian` package ships only typings; tests use hand-written fakes.
      { find: /^obsidian$/, replacement: fake('obsidian') },
      {
        find: /^obsidian-daily-notes-interface$/,
        replacement: fake('obsidian-daily-notes-interface'),
      },
      { find: /^react$/, replacement: 'preact/compat' },
      { find: /^react-dom$/, replacement: 'preact/compat' },
    ],
  },
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'preact' },
  },
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['tests/setup/globals.ts'],
    // Dates in card previews are rendered in local time; pin it for stable snapshots.
    env: { TZ: 'UTC' },
  },
});
