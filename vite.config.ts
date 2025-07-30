import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config'; // configDefaults をインポート

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
  test: {
    include: [...configDefaults.include, 'tests/**/*.{test,spec}.{js,ts}'], // テストファイルのパターン
    alias: {
      '$lib/server/db': './tests/setup-test-db.ts', // $lib/server/db をテスト用の db にエイリアス
    },
    setupFiles: ['./tests/setup-test-env.ts'], // テスト環境のセットアップファイルを指定
  }
});
