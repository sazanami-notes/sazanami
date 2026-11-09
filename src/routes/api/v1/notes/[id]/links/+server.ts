// src/routes/api/v1/notes/[id]/links/+server.ts
// ノートのリンク集（1-hop / 被リンク / 2-hop）。一覧用の noteSummary で返す。
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { notes, noteLinks } from '$lib/server/db/schema';
import { and, eq, inArray, not } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { getPrincipal, hasScope } from '$lib/server/api-auth';
import { apiError, apiJson, preflight } from '$lib/server/api-response';
import { getTagsMap, toApiSummary, type ApiNoteRow } from '$lib/server/api-notes';

export const OPTIONS: RequestHandler = () => preflight();

export const GET: RequestHandler = async ({ params, request }) => {
	const principal = await getPrincipal(request);
	if (!principal) return apiError(401, 'unauthorized', '認証が必要です');
	if (!hasScope(principal, 'read'))
		return apiError(403, 'insufficient_scope', 'readスコープが必要です');

	const noteId = params.id;

	try {
		// 他人のノートは存在自体を隠す（404）
		const owned = await db
			.select({ id: notes.id })
			.from(notes)
			.where(and(eq(notes.id, noteId), eq(notes.userId, principal.userId)))
			.limit(1);
		if (owned.length === 0) return apiError(404, 'not_found', 'ノートが見つかりません');

		const summarize = async (rows: ApiNoteRow[]) => {
			const tagsMap = await getTagsMap(rows.map((row) => row.id));
			return rows.map((row) => toApiSummary(row, tagsMap.get(row.id) ?? []));
		};

		// 1-hop: このノートから張っているリンク
		const targetNote = alias(notes, 'targetNote');
		const oneHopRows = (
			await db
				.select({ note: targetNote })
				.from(noteLinks)
				.innerJoin(targetNote, eq(noteLinks.targetNoteId, targetNote.id))
				.where(and(eq(noteLinks.sourceNoteId, noteId), eq(targetNote.userId, principal.userId)))
		).map((row) => row.note);

		// 被リンク: このノートへ張られているリンク
		const sourceNote = alias(notes, 'sourceNote');
		const backlinkRows = (
			await db
				.select({ note: sourceNote })
				.from(noteLinks)
				.innerJoin(sourceNote, eq(noteLinks.sourceNoteId, sourceNote.id))
				.where(and(eq(noteLinks.targetNoteId, noteId), eq(sourceNote.userId, principal.userId)))
		).map((row) => row.note);

		// 2-hop: 1-hop の先からさらに張られているリンク
		//（自分自身と直接の1-hopは除外する）
		const oneHopTargetIds = (
			await db
				.select({ id: noteLinks.targetNoteId })
				.from(noteLinks)
				.where(eq(noteLinks.sourceNoteId, noteId))
		).map((row) => row.id);

		let twoHopRows: ApiNoteRow[] = [];
		if (oneHopTargetIds.length > 0) {
			const twoHopTargetNote = alias(notes, 'twoHopTargetNote');
			twoHopRows = (
				await db
					.select({ note: twoHopTargetNote })
					.from(noteLinks)
					.innerJoin(twoHopTargetNote, eq(noteLinks.targetNoteId, twoHopTargetNote.id))
					.where(
						and(
							inArray(noteLinks.sourceNoteId, oneHopTargetIds),
							not(eq(noteLinks.targetNoteId, noteId)),
							not(inArray(noteLinks.targetNoteId, oneHopTargetIds)),
							eq(twoHopTargetNote.userId, principal.userId)
						)
					)
			).map((row) => row.note);
		}

		// 2-hop は複数経路で同じノートに到達しうるのでIDで重複排除
		const uniqueTwoHop = new Map<string, ApiNoteRow>();
		for (const row of twoHopRows) uniqueTwoHop.set(row.id, row);

		return apiJson({
			oneHopLinks: await summarize(oneHopRows),
			backlinks: await summarize(backlinkRows),
			twoHopLinks: await summarize([...uniqueTwoHop.values()])
		});
	} catch (error) {
		console.error('Failed to load note links:', error);
		return apiError(500, 'internal_error', 'リンクの取得に失敗しました');
	}
};
