import { auth } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

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

	return {
		session: sessionData?.session || null,
		user: sessionData?.user || null
	};
};
