import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    watch: false,
    fileParallelism: false,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
