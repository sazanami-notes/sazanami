import type { PageServerLoad, Actions } from './$types';
import { getNoteById, updateNote, updateNoteLinks } from '$lib/server/db';
import { error, redirect, isRedirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const note = await getNoteById(locals.user.id, params.id);
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

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		try {
			// Get form data
			const formData = await request.formData();
			const title = formData.get('title')?.toString() || '';
			const contentHtml = formData.get('contentHtml')?.toString() || '';
			const contentBin = formData.get('contentBin')?.toString() || '';

			// Get existing note
			const existingNote = await getNoteById(locals.user.id, params.id);
			if (!existingNote) {
				throw error(404, 'Note not found');
			}

			// Update note
			await updateNote(existingNote.id, locals.user.id, {
				title,
				contentHtml,
				contentBin: contentBin ? Buffer.from(contentBin, 'base64') : null
			});

			try {
				// After updating the note, update its links
				await updateNoteLinks(existingNote.id, contentHtml, locals.user.id);
			} catch (linkError) {
				console.error('Failed to update note links, but note was saved:', linkError);
				// We don't throw here to allow the note save to succeed even if link parsing fails
			}

			// Redirect to the updated note page
			throw redirect(303, `/home/note/${existingNote.id}`);
		} catch (err) {
			if (isRedirect(err)) {
				throw err; // Re-throw redirects
			}
			console.error('Error updating note:', err);
			throw error(500, 'Failed to update note');
		}
	}
};
