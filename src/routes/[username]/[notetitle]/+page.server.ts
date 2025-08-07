import type { PageServerLoad } from './$types';
import { getNoteBySlug } from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const note = await getNoteBySlug(locals.user.id, params.username, params.notetitle);
		if (!note) {
			throw error(404, 'Note not found');
		}
		return { note };
	} catch (err) {
		throw error(500, 'Failed to load note');
	}
};
