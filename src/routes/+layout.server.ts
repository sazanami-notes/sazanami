// src/routes/+layout.server.ts
import { auth } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ request, url }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session && url.pathname !== '/login' && url.pathname !== '/milkdown') {
		throw redirect(303, '/login');
	}

	return { session };
};
