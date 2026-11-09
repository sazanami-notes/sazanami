// src/routes/api/v1/reindex/+server.ts
// 既存ノートの埋め込みをまとめて作る（バックフィル用）。
// カーソル方式で少しずつ処理する: POST { limit?: 20, cursor?: "<note id>" }
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { notes } from '$lib/server/db/schema';
import { and, asc, eq, gt } from 'drizzle-orm';
import { getPrincipal, hasScope } from '$lib/server/api-auth';
import { apiError, apiJson, preflight } from '$lib/server/api-response';
import { embedAndStoreNote, EMBEDDING_MODEL } from '$lib/server/embeddings';

const MAX_BATCH = 50;

export const OPTIONS: RequestHandler = () => preflight();

export const POST: RequestHandler = async ({ request, platform }) => {
	const principal = await getPrincipal(request);
	if (!principal) return apiError(401, 'unauthorized', '認証が必要です');
	if (!hasScope(principal, 'write'))
		return apiError(403, 'insufficient_scope', 'writeスコープが必要です');

	const ai = platform?.env?.AI;
	if (!ai) return apiError(503, 'embeddings_unavailable', 'この環境では埋め込みを利用できません');

	let body: { limit?: number; cursor?: string } = {};
	try {
		body = (await request.json()) as typeof body;
	} catch {
		// ボディなしは既定値で動かす
	}

	const limit = Math.min(Math.max(Number(body.limit ?? 20) || 20, 1), MAX_BATCH);
	const cursor = typeof body.cursor === 'string' && body.cursor ? body.cursor : null;

	const conditions = [eq(notes.userId, principal.userId)];
	if (cursor) conditions.push(gt(notes.id, cursor));

	const rows = await db
		.select({ id: notes.id, title: notes.title, content: notes.content })
		.from(notes)
		.where(and(...conditions))
		.orderBy(asc(notes.id))
		.limit(limit);

	let updated = 0;
	let unchanged = 0;
	let empty = 0;
	const failed: string[] = [];

	for (const row of rows) {
		try {
			const result = await embedAndStoreNote(ai, row);
			if (result === 'updated') updated++;
			else if (result === 'unchanged') unchanged++;
			else empty++;
		} catch (error) {
			console.error('Failed to reindex note:', row.id, error);
			failed.push(row.id);
		}
	}

	return apiJson({
		processed: rows.length,
		updated,
		unchanged,
		empty,
		failed,
		nextCursor: rows.length === limit ? rows[rows.length - 1].id : null,
		model: EMBEDDING_MODEL
	});
};
