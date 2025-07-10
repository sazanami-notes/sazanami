import type { Handle } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';
import { createDb } from '$lib/server/db';

const handleAuth: Handle = async ({ event, resolve }) => {
	// D1データベースを初期化し、event.localsにアタッチ
	if (event.platform?.env?.D1) {
		event.locals.db = createDb(event.platform.env.D1);
	} else {
		event.locals.db = null;
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
