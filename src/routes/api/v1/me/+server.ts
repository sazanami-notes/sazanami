// src/routes/api/v1/me/+server.ts
// 認証中のユーザー情報を返す（トークン・セッションの両対応）。
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getPrincipal, hasScope } from '$lib/server/api-auth';
import { apiError, apiJson, preflight } from '$lib/server/api-response';

export const OPTIONS: RequestHandler = () => preflight();

export const GET: RequestHandler = async ({ request }) => {
	const principal = await getPrincipal(request);
	if (!principal) return apiError(401, 'unauthorized', '認証が必要です');
	if (!hasScope(principal, 'read'))
		return apiError(403, 'insufficient_scope', 'readスコープが必要です');

	try {
		const rows = await db
			.select({
				id: user.id,
				name: user.name,
				username: user.username,
				image: user.image
			})
			.from(user)
			.where(eq(user.id, principal.userId))
			.limit(1);

		const current = rows[0];
		if (!current) return apiError(401, 'unauthorized', 'ユーザーが見つかりません');

		return apiJson({ user: current });
	} catch (error) {
		console.error('Failed to load current user:', error);
		return apiError(500, 'internal_error', 'ユーザー情報の取得に失敗しました');
	}
};
