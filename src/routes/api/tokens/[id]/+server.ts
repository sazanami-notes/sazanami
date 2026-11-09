import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { apiTokens } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { getPrincipal } from '$lib/server/api-auth';
import { apiJson, apiError, preflight } from '$lib/server/api-response';

export const OPTIONS: RequestHandler = () => preflight();

/** トークンを失効させる（削除ではなく revokedAt を立てる）。 */
export const DELETE: RequestHandler = async ({ request, params }) => {
	const principal = await getPrincipal(request);
	if (!principal) return apiError(401, 'unauthorized', 'ログインが必要です');
	if (principal.tokenId)
		return apiError(403, 'session_required', 'トークン管理はブラウザから行ってください');

	const id = params.id;
	if (!id) return apiError(400, 'id_required', 'トークンIDが必要です');

	const [updated] = await db
		.update(apiTokens)
		.set({ revokedAt: new Date() })
		.where(
			and(eq(apiTokens.id, id), eq(apiTokens.userId, principal.userId), isNull(apiTokens.revokedAt))
		)
		.returning({ id: apiTokens.id, revokedAt: apiTokens.revokedAt });

	if (!updated)
		return apiError(
			404,
			'not_found',
			'トークンが見つかりません（すでに失効している可能性があります）'
		);

	return apiJson({ id: updated.id, revokedAt: updated.revokedAt });
};
