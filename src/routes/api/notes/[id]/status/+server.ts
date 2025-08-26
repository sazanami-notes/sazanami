import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notes } from '$lib/server/db/schema';
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

		const now = new Date();

		const result = await db
			.update(notes)
			.set({
				status: status,
				updatedAt: now
			})
			.where(and(eq(notes.id, noteId), eq(notes.userId, session.session.userId)));

		if (result.rowCount === 0) {
			return json(
				{ message: 'Note not found or you do not have permission to edit it' },
				{ status: 404 }
			);
		}

		return json({ success: true, message: `Note moved to ${status}` });
	} catch (error) {
		console.error('Error updating note status:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json({ message: `Internal Server Error: ${errorMessage}` }, { status: 500 });
	}
};
