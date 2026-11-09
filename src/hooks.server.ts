import { createAuth } from '$lib/server/auth';
import { getSessionCached } from '$lib/server/auth-session';
import { building } from '$app/environment';

import type { Handle } from '@sveltejs/kit';

/** 認証不要の静的アセット。ここで早期リターンしないと、画像やJSの1リクエストごとに
 *  セッションDB照会が走る（Workers + リモートTursoでは実測で大きな遅延になる）。 */
const STATIC_PREFIXES = ['/_app/', '/favicon', '/robots.txt', '/sitemap.xml'];
const STATIC_EXTENSIONS =
	/\.(?:js|mjs|css|map|json|txt|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf)$/i;

/** セッション解決をスキップする公開エンドポイント（認証不要） */
const PUBLIC_API = new Set(['/api/v1/health', '/api/v1/openapi.json']);

function isStaticAsset(pathname: string): boolean {
	return STATIC_PREFIXES.some((p) => pathname.startsWith(p)) || STATIC_EXTENSIONS.test(pathname);
}

function securityHeaders(url: URL): Record<string, string> {
	const headers: Record<string, string> = {
		// MIMEスニッフィング禁止（アップロードされた画像を別種として解釈させない）
		'x-content-type-options': 'nosniff',
		// 参照元URLを外部に漏らさない
		'referrer-policy': 'strict-origin-when-cross-origin',
		// iframe埋め込み禁止（クリックジャッキング対策）
		'x-frame-options': 'DENY',
		// 不要なブラウザ機能を無効化
		'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()'
		// CSPは svelte.config.js の kit.csp（nonce方式）で付与する
	};

	if (url.protocol === 'https:') {
		headers['strict-transport-security'] = 'max-age=31536000; includeSubDomains';
	}

	return headers;
}

export const handle: Handle = async ({ event, resolve }) => {
	// During build/analysis, environment variables are unavailable.
	// Defer auth initialization to runtime.
	if (building) {
		return resolve(event);
	}

	const pathname = event.url.pathname;

	// 静的アセットはセッション解決もCSPも不要（レスポンスヘッダーは静的配信側の設定に従う）
	if (isStaticAsset(pathname)) {
		return resolve(event);
	}

	if (!PUBLIC_API.has(pathname)) {
		const auth = createAuth(event.platform?.env as Record<string, string> | undefined);

		try {
			const result = await getSessionCached(event.request.headers);

			if (result) {
				event.locals.session = result.session ?? null;
				event.locals.user = result.user ?? null;
			}
		} catch (error) {
			console.error('Error getting session:', error);
		}

		// /api/auth/* は better-auth に完全委譲する。
		// 標準の svelteKitHandler は「リクエストのオリジン == BETTER_AUTH_URLのオリジン」を要求し、
		// 一致しないオリジン（カスタムドメインと workers.dev の併用時など）からの /api/auth/* が
		// 404 になる。ここではパスのみで委譲し、オリジン検証は better-auth 本体（trustedOrigins）に任せる。
		const authOptions = auth?.options as { basePath?: string } | undefined;
		const basePath = authOptions?.basePath ?? '/api/auth';
		if (pathname === basePath || pathname.startsWith(`${basePath}/`)) {
			const response = await auth.handler(event.request);
			return withSecurityHeaders(response, event.url);
		}
	}

	return withSecurityHeaders(await resolve(event), event.url);
};

function withSecurityHeaders(response: Response, url: URL): Response {
	if (!response || typeof response !== 'object') return response;
	const headers = new Headers(response.headers);
	for (const [key, value] of Object.entries(securityHeaders(url))) {
		// エンドポイント側が明示したヘッダーを優先する
		if (!headers.has(key)) headers.set(key, value);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}
