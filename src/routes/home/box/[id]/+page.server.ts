import type { PageServerLoad, Actions } from './$types';
import { getBoxNoteById, updateBoxLinks } from '$lib/server/db';
import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { box as boxTable } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const note = await getBoxNoteById(locals.user.id, params.id);
		if (!note) {
			throw error(404, 'Note not found');
		}

		const linksResponse = await fetch(`/api/notes/${note.id}/links`);
		if (!linksResponse.ok) {
			console.error('Failed to fetch links:', await linksResponse.text());
			return {
				note,
				links: { oneHopLinks: [], backlinks: [], twoHopLinks: [] }
			};
		}
		const links = await linksResponse.json();

		return { note, links };
	} catch (err) {
		console.error('Failed to load note or links:', err);
		throw error(500, 'Failed to load note');
	}
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		try {
			const formData = await request.formData();
			const title = formData.get('title')?.toString() || '';
			const content = formData.get('content')?.toString() || '';

			const existingNote = await getBoxNoteById(locals.user.id, params.id);
			if (!existingNote) {
				throw error(404, 'Note not found');
			}

			await db
				.update(boxTable)
				.set({ title, content, updatedAt: new Date() })
				.where(and(eq(boxTable.id, existingNote.id), eq(boxTable.userId, locals.user.id)));

			await updateBoxLinks(existingNote.id, content, locals.user.id);

			throw redirect(303, `/home/box/${existingNote.id}`);
		} catch (err) {
			if (err instanceof Error && 'status' in err && err.status === 303) {
				throw err;
			}
			console.error('Error updating note:', err);
			throw error(500, 'Failed to update note');
		}
	}
};
