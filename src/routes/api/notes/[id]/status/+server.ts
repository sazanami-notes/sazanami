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
		const body = await request.json();
		const { status } = body as { status: string };

		if (!status || !['inbox', 'box', 'archived', 'trash'].includes(status)) {
			return json({ message: 'Invalid status provided' }, { status: 400 });
		}

		// 既存のノートの状態を取得
		const existingNote = await db
			.select({ status: notes.status })
			.from(notes)
			.where(and(eq(notes.id, noteId), eq(notes.userId, session.session.userId)))
			.limit(1);

		if (existingNote.length === 0) {
			return json(
				{ message: 'Note not found or you do not have permission to edit it' },
				{ status: 404 }
			);
		}
		const oldStatus = existingNote[0].status;

		// ステータスが実際に変更された場合のみ更新
		if (oldStatus === status) {
			return json({ success: true, message: `Note is already in ${status}` });
		}

		const now = new Date();

		const result = await db
			.update(notes)
			.set({
				status: status,
				updatedAt: now
			})
			.where(and(eq(notes.id, noteId), eq(notes.userId, session.session.userId)));

		if (result.rowCount > 0) {
			// タイムラインイベントを記録
			await db.insert(timeline).values({
				userId: session.session.userId,
				noteId: noteId,
				type: 'note_status_changed',
				createdAt: now,
				metadata: JSON.stringify({ from: oldStatus, to: status })
			});
		}

		return json({ success: true, message: `Note moved to ${status}` });
	} catch (error) {
		console.error('Error updating note status:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json({ message: `Internal Server Error: ${errorMessage}` }, { status: 500 });
	}
};
