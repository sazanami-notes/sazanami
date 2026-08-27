import { redirect, type ServerLoad } from '@sveltejs/kit';
import { createAuth } from '$lib/server/auth';
import { pickEncounter } from '$lib/server/encounter';
const auth = createAuth();

export const load: ServerLoad = async ({ request }) => {
	const sessionData = await auth.api.getSession({
		headers: request.headers
	});

	if (!sessionData?.session) {
		throw redirect(302, '/login');
	}

	// 今日の出会い（FSRS式の再提示）を1件取得
	const encounter = await pickEncounter(sessionData.user.id);

	return {
		encounter,
		user: sessionData.user,
		session: sessionData.session
	};
};