import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { notes, noteTags, tags } from '$lib/server/db/schema';
import { noteListSelect } from '$lib/server/db/note-list';
import { and, eq, desc, sql, like, or, inArray, type SQL } from 'drizzle-orm';
import { getSessionCached } from '$lib/server/auth-session';
import { semanticSearch } from '$lib/server/embeddings';
export const load: PageServerLoad = async ({ request, url, platform }) => {
	const sessionData = await getSessionCached(request.headers);

	if (!sessionData?.session) {
		throw redirect(302, '/login');
	}

	const q = (url.searchParams.get('q') || '').trim();
	const mode = url.searchParams.get('mode') === 'semantic' ? 'semantic' : 'keyword';
	const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10));
	const limit = 20;
	const offset = (page - 1) * limit;

	// 意味検索（埋め込みが使える環境のみ）。ページングはせず上位N件を返す。
	const ai = platform?.env?.AI;
	if (q && mode === 'semantic' && ai) {
		const hits = await semanticSearch(ai, sessionData.user.id, q, 30);
		if (hits.length === 0) {
			return {
				q,
				mode,
				semanticAvailable: true,
				notes: [],
				pagination: { page: 1, limit: 30, total: 0, totalPages: 1 }
			};
		}

		const rows = await db
			.select({ ...noteListSelect })
			.from(notes)
			.leftJoin(noteTags, eq(notes.id, noteTags.noteId))
			.leftJoin(tags, eq(noteTags.tagId, tags.id))
			.where(
				and(
					eq(notes.userId, sessionData.user.id),
					inArray(
						notes.id,
						hits.map((hit) => hit.id)
					)
				)
			)
			.groupBy(notes.id);

		const byId = new Map(rows.map((row) => [row.id, row]));
		const ordered = hits.flatMap((hit) => {
			const row = byId.get(hit.id);
			if (!row) return [];
			return [
				{
					...row,
					title: row.title ?? '',
					content: row.content ?? '',
					tags: row.tags ? row.tags.split(',') : [],
					score: Number((1 - hit.distance).toFixed(3))
				}
			];
		});

		return {
			q,
			mode,
			semanticAvailable: true,
			notes: ordered,
			pagination: { page: 1, limit: 30, total: ordered.length, totalPages: 1 }
		};
	}

	const conditions: (SQL | undefined)[] = [eq(notes.userId, sessionData.user.id)];
	if (q) {
		conditions.push(or(like(notes.title, `%${q}%`), like(notes.content, `%${q}%`)));
	}

	const notesResult = await db
		.select({ ...noteListSelect })
		.from(notes)
		.leftJoin(noteTags, eq(notes.id, noteTags.noteId))
		.leftJoin(tags, eq(noteTags.tagId, tags.id))
		.where(and(...conditions))
		.groupBy(notes.id)
		.orderBy(desc(notes.updatedAt))
		.limit(limit)
		.offset(offset);

	const countResult = await db
		.select({ count: sql<number>`COUNT(*)` })
		.from(notes)
		.where(and(...conditions));

	const total = countResult[0]?.count || 0;
	const totalPages = Math.max(1, Math.ceil(total / limit));

	const notesWithTags = notesResult.map((note) => ({
		...note,
		title: note.title ?? '',
		content: note.content ?? '',
		tags: note.tags ? note.tags.split(',') : []
	}));

	return {
		q,
		mode,
		semanticAvailable: Boolean(platform?.env?.AI),
		notes: notesWithTags,
		pagination: {
			page,
			limit,
			total,
			totalPages
		}
	};
};
