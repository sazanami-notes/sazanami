import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// prosemirror系が入れ子で重複インストールされると
	// "multiple versions of prosemirror-model were loaded" でTiptapが壊れるため、
	// バンドラ側で単一インスタンスに寄せる
	resolve: {
		dedupe: ['prosemirror-model', 'prosemirror-view', 'prosemirror-state', 'prosemirror-transform']
	},
	// @jsquash/avif が同梱するマルチスレッドWASMワーカー（avif_enc_mt.js）を
	// Rollupがiifeで出力しようとして失敗するため、ES形式に固定する
	worker: {
		format: 'es'
	},
	ssr: {
		external: ['nodemailer']
	},
	build: {
		rollupOptions: {
			external: ['nodemailer']
		}
	},
	server: {
		host: '0.0.0.0',
		port: 5173,
		cors: true,
		headers: {
			'Access-Control-Allow-Origin': '*'
		}
	},
	test: {
		include: [...configDefaults.include, 'tests/**/*.{test,spec}.{js,ts}'], // テストファイルのパターン
		exclude: [...configDefaults.exclude, 'e2e/**'], // e2eはPlaywright側で実行するため除外
		alias: {},
		setupFiles: ['./tests/setup-test-env.ts'] // テスト環境のセットアップファイルを指定
	}
});
