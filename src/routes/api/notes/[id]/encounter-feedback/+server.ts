import { json, type RequestHandler } from '@sveltejs/kit';

import { createAuth } from '$lib/server/auth';
import { applyEncounterFeedback } from '$lib/server/encounter';

const auth = createAuth();

export const POST: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const noteId = params.id;
	if (!noteId) {
		return json({ message: 'Note ID is required' }, { status: 400 });
	}

	let body: { action?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ message: 'Invalid JSON body' }, { status: 400 });
	}

	if (body.action !== 'like' && body.action !== 'skip') {
		return json({ message: "action must be 'like' or 'skip'" }, { status: 400 });
	}

	try {
		const result = await applyEncounterFeedback(
			session.session.userId,
			noteId,
			body.action as 'like' | 'skip'
		);
		if (!result.success) {
			return json({ message: 'Note not found' }, { status: 404 });
		}
		return json({ success: true, encounterBoost: result.encounterBoost }, { status: 200 });
	} catch (error) {
		console.error('Error updating encounter feedback:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json({ message: `Internal Server Error: ${errorMessage}` }, { status: 500 });
	}
};
