import { redirect, type ServerLoad } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notes, noteTags, tags } from '$lib/server/db/schema';
import { noteListSelect } from '$lib/server/db/note-list';
import { and, eq, desc } from 'drizzle-orm';
import { createAuth } from '$lib/server/auth';
const auth = createAuth();

export const load: ServerLoad = async ({ request }) => {
	const sessionData = await auth.api.getSession({
		headers: request.headers
	});

	if (!sessionData?.session) {
		throw redirect(302, '/login');
	}

	const notesResult = await db
		.select({ ...noteListSelect })
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

	// リプライを親ごとにまとめる（タイムラインのスレッド表示用）
	const parents = notesWithTags.filter((note) => !note.parentId);
	const repliesByParent: Record<string, typeof notesWithTags> = {};
	for (const note of notesWithTags) {
		if (note.parentId) {
			if (!repliesByParent[note.parentId]) repliesByParent[note.parentId] = [];
			repliesByParent[note.parentId].push(note);
		}
	}

	// 今日の出会いは /home/encounters ページで取得する（タイムラインから分離）
	return {
		notes: parents,
		repliesByParent,
		user: sessionData.user,
		session: sessionData.session
	};
};
