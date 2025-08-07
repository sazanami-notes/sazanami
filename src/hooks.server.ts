import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Log request details for debugging
	console.log(`Request: ${event.request.method} ${event.url.pathname}`);
	
	// Get the session and add it to the event.locals
	try {
		const session = await auth.api.getSession({
			headers: event.request.headers,
			cookies: event.cookies
		});
		
		if (session) {
			console.log('Session found for user:', session.user?.name || 'unknown');
		} else {
			console.log('No session found');
		}
		
		// Add session to locals for easy access in routes
		event.locals.session = session;
		event.locals.user = session?.user;
	} catch (error) {
		console.error('Error getting session:', error);
	}
	
	// Continue with the better-auth handler
	return svelteKitHandler({ event, resolve, auth, building });
};
