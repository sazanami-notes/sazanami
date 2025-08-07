import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config'; // configDefaults をインポート

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		host: '0.0.0.0',
		port: 12000,
		cors: true,
		headers: {
			'Access-Control-Allow-Origin': '*'
		}
	},
	test: {
		include: [...configDefaults.include, 'tests/**/*.{test,spec}.{js,ts}'], // テストファイルのパターン
		alias: {},
		setupFiles: ['./tests/setup-test-env.ts'] // テスト環境のセットアップファイルを指定
	}
});
