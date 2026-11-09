// src/routes/api/v1/search/semantic/+server.ts
// 意味検索（埋め込みベクトルの近傍探索）。bge-m3 でクエリを埋め込み、
// Turso の vector_top_k でノートを距離順に返す。
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { notes } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';
import { getPrincipal, hasScope } from '$lib/server/api-auth';
import { apiError, apiJson, preflight } from '$lib/server/api-response';
import { getTagsMap, toApiSummary } from '$lib/server/api-notes';
import { EMBEDDING_MODEL, semanticSearch } from '$lib/server/embeddings';

function parseLimit(raw: string | null): number {
	const parsed = Number.parseInt(raw ?? '', 10);
	if (!Number.isFinite(parsed) || parsed < 1) return 20;
	return Math.min(parsed, 50);
}

export const OPTIONS: RequestHandler = () => preflight();

export const GET: RequestHandler = async ({ url, request, platform }) => {
	const principal = await getPrincipal(request);
	if (!principal) return apiError(401, 'unauthorized', '認証が必要です');
	if (!hasScope(principal, 'read'))
		return apiError(403, 'insufficient_scope', 'readスコープが必要です');

	const q = (url.searchParams.get('q') ?? '').trim();
	if (!q) return apiError(400, 'q_required', '検索クエリ q が必要です');

	const ai = platform?.env?.AI;
	if (!ai) return apiError(503, 'embeddings_unavailable', 'この環境では意味検索が利用できません');

	const limit = parseLimit(url.searchParams.get('limit'));

	try {
		const hits = await semanticSearch(ai, principal.userId, q, limit);
		if (hits.length === 0) {
			return apiJson({ notes: [], total: 0, q, model: EMBEDDING_MODEL });
		}

		const rows = await db
			.select()
			.from(notes)
			.where(
				inArray(
					notes.id,
					hits.map((hit) => hit.id)
				)
			);
		const byId = new Map(rows.map((row) => [row.id, row]));
		const tagsMap = await getTagsMap(rows.map((row) => row.id));

		const ranked = hits.flatMap((hit) => {
			const row = byId.get(hit.id);
			if (!row) return [];
			return [
				{
					...toApiSummary(row, tagsMap.get(row.id) ?? []),
					// コサイン距離 → 類似度（1に近いほど近い）
					score: Number((1 - hit.distance).toFixed(4)),
					distance: Number(hit.distance.toFixed(6))
				}
			];
		});

		return apiJson({ notes: ranked, total: ranked.length, q, model: EMBEDDING_MODEL });
	} catch (error) {
		console.error('Failed to run semantic search:', error);
		return apiError(500, 'internal_error', '意味検索に失敗しました');
	}
};
