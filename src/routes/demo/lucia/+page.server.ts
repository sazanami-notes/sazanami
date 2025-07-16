import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth'; // authを正しくインポート

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user; // Better Authはevent.locals.userを自動的に設定します
	if (!user) {
		redirect(302, '/demo/lucia/login');
	}
	return { user };
};

export const actions: Actions = {
	logout: async (event) => {
		if (!event.locals.session) {
			return fail(401);
		}
		const betterAuthInstance = auth(event.platform?.env?.DB!); // D1Databaseを渡してBetter Authインスタンスを取得
		await betterAuthInstance.api.signOut(); // Better Authのapi.signOutを使用

		return redirect(302, '/demo/lucia/login');
	}
};
