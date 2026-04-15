// @ts-nocheck
import { auth } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/connection';
import { userSettings, themes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load = async ({ request, url }: Parameters<LayoutServerLoad>[0]) => {
	const queryParams = url.searchParams.toString();
	const sessionData = await auth.api.getSession({
		headers: request.headers
	});

	const allowedPaths = ['/login', '/login/two-factor', '/'];
	const isAllowedPath =
		allowedPaths.includes(url.pathname) ||
		(url.pathname !== '/' && // `/` は上で処理済み
			!url.pathname.startsWith('/home') &&
			!url.pathname.startsWith('/settings') &&
			!url.pathname.includes('/edit')); // /[username]/edit 等は除外

	if (!sessionData?.session && !isAllowedPath) {
		let redirectUrl = '/login';
		if (queryParams) redirectUrl += `?${queryParams}`;
		throw redirect(302, redirectUrl);
	}

	let settings = null;
	let userThemes: (typeof themes.$inferSelect)[] = [];

	if (sessionData?.user) {
		settings = await db.query.userSettings.findFirst({
			where: eq(userSettings.userId, sessionData.user.id)
		});

		userThemes = await db.query.themes.findMany({
			where: eq(themes.userId, sessionData.user.id)
		});
	}

	return {
		session: sessionData?.session || null,
		user: sessionData?.user || null,
		userThemes,
		settings: settings || {
			themeMode: 'system',
			lightThemeId: 'sazanami-days',
			darkThemeId: 'sazanami-night',
			font: 'sans-serif'
		}
	};
};
