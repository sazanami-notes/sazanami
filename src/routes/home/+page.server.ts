import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notes, noteTags, tags } from '$lib/server/db/schema';
import { and, eq, desc, sql } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import type { ServerLoad } from '@sveltejs/kit';
import { page } from "$app/state";

export const load: ServerLoad = async ({ params, request }) => {
	const queryParams = params.toString(); 
	const sessionData = await auth.api.getSession({
		headers: request.headers
	});

	if (!sessionData?.session) {
		let redirectUrl = '/login';
		if (queryParams) redirectUrl += `?${queryParams}`;
		throw redirect(302, redirectUrl);
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
			tags: sql<string>`GROUP_CONCAT(${tags.name})`.as('tags')
		})
		.from(notes)
		.leftJoin(noteTags, eq(notes.id, noteTags.noteId))
		.leftJoin(tags, eq(noteTags.tagId, tags.id))
		.where(and(eq(notes.userId, sessionData.user.id), eq(notes.status, 'inbox')))
		.groupBy(notes.id)
		.orderBy(desc(notes.isPinned), desc(notes.updatedAt))
		.limit(100);

	const notesWithTags = notesResult.map((note) => ({
		...note,
		title: note.title ?? '',
		content: note.content ?? '',
		tags: note.tags ? note.tags.split(',') : []
	}));

	return {
		notes: notesWithTags,
		user: sessionData.user,
		session: sessionData.session
	};
};
