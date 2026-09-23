import { createAuth } from '$lib/server/auth';
import { getSessionCached } from '$lib/server/auth-session';
import { svelteKitHandler } from 'better-auth/svelte-kit';
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

	return svelteKitHandler({ event, resolve, auth, building });
};
