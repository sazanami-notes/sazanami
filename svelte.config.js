import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		// CSPはSvelteKitのノンセ機構に任せる（自前ヘッダーだと script-src に
		// 'unsafe-inline' が必要になり、XSS対策としてほぼ機能しないため）。
		// mode: 'auto' = 本番はnonce、開発はunsafe-inline。
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self', 'wasm-unsafe-eval', 'https://cdn.jsdelivr.net'], // /docs の Scalar
				'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
				'img-src': ['self', 'data:', 'blob:', 'https:'],
				'font-src': ['self', 'data:', 'https://fonts.gstatic.com'],
				'connect-src': ['self'],
				'media-src': ['self', 'https:'],
				'frame-src': ['https://www.youtube-nocookie.com', 'https://www.youtube.com'],
				'worker-src': ['self', 'blob:'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'form-action': ['self'],
				'frame-ancestors': ['none']
			}
		}
	}
};

export default config;
