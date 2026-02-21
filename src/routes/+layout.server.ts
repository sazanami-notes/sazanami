import { auth } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { userSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ request, url }) => {
	const queryParams = url.searchParams.toString();
	const sessionData = await auth.api.getSession({
		headers: request.headers
	});

	const allowedPaths = ['/login', '/login/two-factor', '/'];
	if (!sessionData?.session && !allowedPaths.includes(url.pathname)) {
		let redirectUrl = '/login';
		if (queryParams) redirectUrl += `?${queryParams}`;
		throw redirect(302, redirectUrl);
	}

	let settings = null;
	if (sessionData?.user) {
		const result = await db.select().from(userSettings).where(eq(userSettings.userId, sessionData.user.id)).limit(1);
		settings = result[0] || null;
	}

	return {
		session: sessionData?.session || null,
		user: sessionData?.user || null,
		settings: settings || {
			userId: sessionData?.user?.id || '',
			theme: 'system',
			font: 'sans-serif',
			primaryColor: null,
			secondaryColor: null,
			accentColor: null,
			backgroundColor: null,
			textColor: null,
			username: null,
			bio: null
		}
	};
};
