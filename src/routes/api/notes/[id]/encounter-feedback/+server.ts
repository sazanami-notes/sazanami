import { json, type RequestHandler } from '@sveltejs/kit';

import { getSessionCached } from '$lib/server/auth-session';
import { applyEncounterFeedback } from '$lib/server/encounter';
export const POST: RequestHandler = async ({ request, params }) => {
	const session = await getSessionCached(request.headers);
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
		// 内部エラーの詳細はクライアントに返さない（情報漏洩対策）。詳細はサーバーログのみ。
		return json({ message: 'Internal Server Error' }, { status: 500 });
	}
};
