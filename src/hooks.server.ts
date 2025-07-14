import type { Handle } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';
import { createDb } from '$lib/server/db';

const handleAuth: Handle = async ({ event, resolve }) => {
	// D1データベースを初期化し、event.localsにアタッチ
	console.log('event.platform.env.DB:', event.platform?.env?.DB);
	if (event.platform?.env?.DB) {
		event.locals.db = createDb(event.platform.env.DB);
	} else {
		event.locals.db = null;
		console.log('Database not available in event.platform.env.DB');
	}

	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (!sessionToken || !event.locals.db) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await auth.validateSessionToken(sessionToken, event.locals.db);

	if (session) {
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
	} else {
		auth.deleteSessionTokenCookie(event);
	}

	event.locals.user = user;
	event.locals.session = session;
	return resolve(event);
};

export const handle: Handle = handleAuth;
