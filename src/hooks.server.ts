import { createAuth } from '$lib/server/auth'; // 修正したパスからインポート
import { svelteKitHandler } from 'better-auth/svelte-kit';

export async function handle({ event, resolve }) {
	// APIリクエストの場合
	if (event.url.pathname.startsWith('/api/auth/')) {
		// D1のDBインスタンスを取得
		const db = event.platform?.env.DB;
		if (!db) {
			return new Response('Database not found', { status: 500 });
		}
		// リクエストごとにauthインスタンスを生成
		const auth = createAuth(db);
		return svelteKitHandler({ event, resolve, auth });
	}

	// 通常のページリクエストの場合
	// event.localsに認証情報を格納して、サーバーサイドのload関数などで使えるようにする
	const db = event.platform?.env.DB;
	if (db) {
		event.locals.auth = createAuth(db).api;
		const session = await event.locals.auth.getSession({ headers: event.request.headers });
		if (session) {
			event.locals.user = session.user;
			event.locals.session = session.session;
		}
	}

	return resolve(event);
}
