import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// localsからuser情報を取得
	const { user } = locals;
	if (!user) {
		redirect(302, '/demo/lucia/login');
	}
	return { user };
};

export const actions: Actions = {
	logout: async ({ locals, request }) => { // requestも受け取る
		if (!locals.session) {
			return fail(401);
		}
		// signOutにheadersを渡す
		await locals.auth.signOut({ headers: request.headers });

		return redirect(302, '/demo/lucia/login');
	}
};
