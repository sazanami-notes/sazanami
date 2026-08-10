import { json, type RequestHandler } from '@sveltejs/kit';

import { createAuth } from '$lib/server/auth';
import { pickEncounter } from '$lib/server/encounter';

const auth = createAuth();

export const GET: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	try {
		const note = await pickEncounter(session.session.userId);
		return json({ note }, { status: 200 });
	} catch (error) {
		console.error('Error getting encounter:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json({ message: `Internal Server Error: ${errorMessage}` }, { status: 500 });
	}
};
