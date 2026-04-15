import { json, type RequestHandler } from '@sveltejs/kit';

import { db } from '$lib/server/db';
import { notes, timeline } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const noteId = params.id;
	if (!noteId) {
		return json({ message: 'Note ID is required' }, { status: 400 });
	}

	try {
		// First, get the current state of the note
		const noteArray = await db
			.select({ isPinned: notes.isPinned })
			.from(notes)
			.where(and(eq(notes.id, noteId), eq(notes.userId, session.session.userId)))
			.limit(1);

		if (noteArray.length === 0) {
			return json(
				{ message: 'Note not found or you do not have permission to edit it' },
				{ status: 404 }
			);
		}
		const currentNote = noteArray[0];
		const newPinnedState = !currentNote.isPinned;
		const now = new Date();

		// Update the note with the new pinned state
		await db
			.update(notes)
			.set({
				isPinned: newPinnedState,
				updatedAt: now
			})
			.where(and(eq(notes.id, noteId), eq(notes.userId, session.session.userId)));

		// タイムラインイベントを記録
		await db.insert(timeline).values({
			userId: session.session.userId,
			noteId: noteId,
			type: newPinnedState ? 'note_pinned' : 'note_unpinned',
			createdAt: now
		});

		return json({ success: true, isPinned: newPinnedState });
	} catch (error) {
		console.error('Error toggling pin status:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json({ message: `Internal Server Error: ${errorMessage}` }, { status: 500 });
	}
};
