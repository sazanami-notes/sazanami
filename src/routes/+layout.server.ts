// src/routes/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// `hooks.server.ts` を経由して better-auth がセットした user 情報を取得
	const { user } = locals;

	// 現在のページがログインページかどうかの判定
	const isLoginPage = url.pathname.startsWith('/login');

	// --- ログイン状態に応じたリダイレクト処理 ---
    // ▼▼▼ デバッグ用にこの3行を追加 ▼▼▼
	console.log('--- +layout.server.ts called ---');
	console.log('Received locals:', locals);
	console.log('User object inside locals:', locals.user);
	// ▲▲▲ ここまで ▲▲▲

	// ① ログインしていない場合
	if (!user) {
		// かつ、アクセス先がログインページで「なければ」、ログインページへ強制的にリダイレクト
		if (!isLoginPage) {
			throw redirect(302, '/login');
		}
	}
	// ② ログインしている場合
	else {
		// なのに、アクセス先がログインページ「なら」、メインページへリダイレクト
		if (isLoginPage) {
			throw redirect(302, '/');
		}
	}

	// リダイレクトしない場合は、user情報を全てのページに渡す
	// これで、$page.data.user のようにどこからでもユーザー情報にアクセスできます
	return { user };
};