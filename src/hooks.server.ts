import { createAuth } from '$lib/server/auth';
import { getSessionCached } from '$lib/server/auth-session';
import { building } from '$app/environment';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// During build/analysis, environment variables are unavailable.
	// Defer auth initialization to runtime.
	if (building) {
		return resolve(event);
	}

	const auth = createAuth(event.platform?.env);

	try {
		const result = await getSessionCached(event.request.headers);

		if (result) {
			console.log('Session found for user:', result.user?.name || 'unknown');
			event.locals.session = result.session ?? null;
			event.locals.user = result.user ?? null;
		} else {
			console.log('No session found');
		}
	} catch (error) {
		console.error('Error getting session:', error);
	}

	// /api/auth/* は better-auth に完全委譲する。
	// 標準の svelteKitHandler は「リクエストのオリジン == BETTER_AUTH_URL のオリジン」を要求し、
	// 一致しないオリジン（カスタムドメインと workers.dev の併用時など）からの /api/auth/* が
	// 404 になる。ここではパスのみで委譲し、オリジン検証は better-auth 本体（trustedOrigins）に任せる。
	const basePath = (auth.options as { basePath?: string }).basePath ?? '/api/auth';
	if (event.url.pathname === basePath || event.url.pathname.startsWith(`${basePath}/`)) {
		return auth.handler(event.request);
	}

	return resolve(event);
};
