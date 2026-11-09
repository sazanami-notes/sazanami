// src/routes/api/v1/search/+server.ts
// ノート検索（タイトル・本文の部分一致）。一覧用の noteSummary を返す。
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { notes } from '$lib/server/db/schema';
import { and, desc, eq, inArray, like, notInArray, or, sql } from 'drizzle-orm';
import { getPrincipal, hasScope } from '$lib/server/api-auth';
import { apiError, apiJson, preflight } from '$lib/server/api-response';
import { getTagsMap, isNoteStatus, toApiSummary, type NoteStatus } from '$lib/server/api-notes';

// status 指定がないときに対象から外すステータス（ゴミ箱・Boxのゴミ箱）
const DEFAULT_EXCLUDED_STATUSES = ['trash', 'box-deleted'];

/** limit を 1〜max に丸める（不正値は既定値） */
function parseLimit(raw: string | null, fallback: number, max: number): number {
	const parsed = Number.parseInt(raw ?? '', 10);
	if (!Number.isFinite(parsed) || parsed < 1) return fallback;
	return Math.min(parsed, max);
}

/** offset を 0 以上に丸める（不正値は0） */
function parseOffset(raw: string | null): number {
	const parsed = Number.parseInt(raw ?? '', 10);
	if (!Number.isFinite(parsed) || parsed < 0) return 0;
	return parsed;
}

/** status クエリ（カンマ区切り）を既知のステータスだけに絞る */
function parseStatuses(raw: string | null): NoteStatus[] {
	if (!raw) return [];
	const statuses = raw
		.split(',')
		.map((value) => value.trim())
		.filter(isNoteStatus);
	return [...new Set(statuses)];
}

export const OPTIONS: RequestHandler = () => preflight();

export const GET: RequestHandler = async ({ url, request }) => {
	const principal = await getPrincipal(request);
	if (!principal) return apiError(401, 'unauthorized', '認証が必要です');
	if (!hasScope(principal, 'read'))
		return apiError(403, 'insufficient_scope', 'readスコープが必要です');

	const q = (url.searchParams.get('q') ?? '').trim();
	if (!q) return apiError(400, 'q_required', '検索クエリ q が必要です');

	const limit = parseLimit(url.searchParams.get('limit'), 20, 100);
	const offset = parseOffset(url.searchParams.get('offset'));
	const statuses = parseStatuses(url.searchParams.get('status'));

	const pattern = `%${q}%`;
	const conditions = [
		eq(notes.userId, principal.userId),
		or(like(notes.title, pattern), like(notes.content, pattern))
	];
	if (statuses.length > 0) {
		conditions.push(inArray(notes.status, statuses));
	} else {
		conditions.push(notInArray(notes.status, DEFAULT_EXCLUDED_STATUSES));
	}
	const where = and(...conditions);

	try {
		const rows = await db
			.select()
			.from(notes)
			.where(where)
			.orderBy(desc(notes.updatedAt))
			.limit(limit)
			.offset(offset);

		const countRows = await db
			.select({ count: sql<number>`COUNT(*)` })
			.from(notes)
			.where(where);
		const tagsMap = await getTagsMap(rows.map((row) => row.id));

		return apiJson({
			notes: rows.map((row) => toApiSummary(row, tagsMap.get(row.id) ?? [])),
			total: Number(countRows[0]?.count ?? 0),
			q
		});
	} catch (error) {
		console.error('Failed to search notes:', error);
		return apiError(500, 'internal_error', '検索に失敗しました');
	}
};
