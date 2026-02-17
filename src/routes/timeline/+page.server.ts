import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notes, noteTags, tags } from '$lib/server/db/schema';
import { and, eq, desc, sql } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async ({ request }) => {
	const sessionData = await auth.api.getSession({
		headers: request.headers
	});

	if (!sessionData?.session) {
		throw redirect(302, '/login');
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
		.where(and(eq(notes.userId, sessionData.user.id), eq(notes.status, 'inbox')))
		.groupBy(notes.id)
		.orderBy(desc(notes.isPinned), desc(notes.updatedAt))
		.limit(100);

	const notesWithExtras = notesResult.map((note, index) => {
		// Mock attachments for the 2nd note (index 1)
		let attachments: { url: string; type: 'image' | 'video' }[] = [];
		if (index === 1) {
			attachments = [
				{ url: 'https://placehold.co/400x400/e2e8f0/e2e8f0', type: 'image' }, // Gray placeholder
				{ url: 'https://placehold.co/400x400/e2e8f0/e2e8f0', type: 'image' },
				{ url: 'https://placehold.co/400x400/e2e8f0/e2e8f0', type: 'image' },
				{ url: 'https://placehold.co/400x400/e2e8f0/e2e8f0', type: 'image' }
			];
		}

		// Mock quoted note for the 3rd note (index 2)
		let quotedNote = null;
		if (index === 2 && notesResult.length > 0) {
			// Create a fake quoted note based on the first one
			const base = notesResult[0];
			quotedNote = {
				...base,
				title: base.title ?? '',
				content: 'This is a quoted note content. ' + (base.content ?? ''),
				tags: base.tags ? base.tags.split(',') : []
			};
		}

		return {
			...note,
			title: note.title ?? '',
			content: note.content ?? '',
			tags: note.tags ? note.tags.split(',') : [],
			attachments,
			quotedNote
		};
	});

	return {
		notes: notesWithExtras,
		user: sessionData.user,
		session: sessionData.session
	};
};
