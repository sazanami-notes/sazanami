import type { PageServerLoad } from './$types';
import { getNoteBySlug } from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const note = await getNoteBySlug(locals.user.id, params.username, params.notetitle);
		if (!note) {
			throw error(404, 'Note not found');
		}

		// Fetch link data
		const linksResponse = await fetch(`/api/notes/${note.id}/links`);
		if (!linksResponse.ok) {
			// Don't fail the whole page, just log the error and return empty links
			console.error('Failed to fetch links:', await linksResponse.text());
			return {
				note,
				links: { oneHopLinks: [], backlinks: [], twoHopLinks: [] }
			};
		}
		const links = await linksResponse.json();

		return { note, links };
	} catch (err) {
		// If the note itself fails to load, we should still throw an error
		console.error('Failed to load note or links:', err);
		throw error(500, 'Failed to load note');
	}
};
