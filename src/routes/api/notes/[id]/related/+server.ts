// src/routes/api/notes/[id]/related/+server.ts
// ノート詳細の下部に出す「意味が近いノート」。セッション認証の内部API。
import { json, type RequestHandler } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { notes } from '$lib/server/db/schema';
import { getSessionCached } from '$lib/server/auth-session';
import { embedAndStoreNote, relatedNotes } from '$lib/server/embeddings';

function parseLimit(raw: string | null): number {
	const parsed = Number.parseInt(raw ?? '', 10);
	if (!Number.isFinite(parsed) || parsed < 1) return 6;
	return Math.min(parsed, 20);
}

export const GET: RequestHandler = async ({ params, request, platform, url }) => {
	const session = await getSessionCached(request.headers);
	if (!session?.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const noteId = params.id;
	if (!noteId) return json({ message: 'Note ID is required' }, { status: 400 });

	const ai = platform?.env?.AI;
	if (!ai) {
		return json({ related: [], reason: 'embeddings_unavailable' });
	}

	const [note] = await db
		.select()
		.from(notes)
		.where(and(eq(notes.id, noteId), eq(notes.userId, session.user.id)))
		.limit(1);

	if (!note) return json({ message: 'Note not found' }, { status: 404 });

	try {
		// このノートのベクトルが無ければ作る（開いたときに自己修復する）
		await embedAndStoreNote(ai, note);

		const limit = parseLimit(url.searchParams.get('limit'));
		const hits = await relatedNotes(ai, session.user.id, note, limit);
		if (hits.length === 0) return json({ related: [] });

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

		const related = hits.flatMap((hit) => {
			const row = byId.get(hit.id);
			if (!row) return [];
			return [
				{
					...row,
					score: Number((1 - hit.distance).toFixed(3)),
					distance: Number(hit.distance.toFixed(5))
				}
			];
		});

		return json({ related });
	} catch (error) {
		console.error('Failed to load related notes:', error);
		return json({ related: [], reason: 'internal_error' }, { status: 500 });
	}
};
