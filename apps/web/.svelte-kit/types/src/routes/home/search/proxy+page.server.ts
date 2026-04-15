// @ts-nocheck
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { notes, noteTags, tags } from '$lib/server/db/schema';
import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import { auth } from '$lib/server/auth';

export const load = async ({ request, url }: Parameters<PageServerLoad>[0]) => {
	const sessionData = await auth.api.getSession({
		headers: request.headers
	});

	if (!sessionData?.session) {
		throw redirect(302, '/login');
	}

	const q = (url.searchParams.get('q') || '').trim();
	const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10));
	const limit = 20;
	const offset = (page - 1) * limit;

	const conditions: any[] = [eq(notes.userId, sessionData.user.id)];
	if (q) {
		conditions.push(or(like(notes.title, `%${q}%`), like(notes.content, `%${q}%`)));
	}

	const notesResult = await db
		.select({
			id: notes.id,
			title: notes.title,
			content: notes.content,
			updatedAt: notes.updatedAt,
			isPinned: notes.isPinned,
			userId: notes.userId,
			createdAt: notes.createdAt,
			isPublic: notes.isPublic,
			slug: notes.slug,
			status: notes.status,
			tags: sql<string>`GROUP_CONCAT(${tags.name})`.as('tags')
		})
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
		notes: notesWithTags,
		pagination: {
			page,
			limit,
			total,
			totalPages
		}
	};
};