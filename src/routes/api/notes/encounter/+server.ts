import { json, type RequestHandler } from '@sveltejs/kit';

import { getSessionCached } from '$lib/server/auth-session';
import { pickEncounter } from '$lib/server/encounter';
export const GET: RequestHandler = async ({ request }) => {
	const session = await getSessionCached(request.headers);
	if (!session) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	try {
		const note = await pickEncounter(session.session.userId);
		return json({ note }, { status: 200 });
	} catch (error) {
		console.error('Error getting encounter:', error);
		// 内部エラーの詳細はクライアントに返さない（情報漏洩対策）。詳細はサーバーログのみ。
		return json({ message: 'Internal Server Error' }, { status: 500 });
	}
};
