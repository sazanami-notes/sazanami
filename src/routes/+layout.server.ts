import { auth } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { userProfiles } from '$lib/server/db/schema';
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

	let profile = null;
	if (sessionData?.user) {
		const profiles = await db.select().from(userProfiles).where(eq(userProfiles.userId, sessionData.user.id)).limit(1);
		profile = profiles[0] || null;
	}

	return {
		session: sessionData?.session || null,
		user: sessionData?.user || null,
		profile
	};
};
