import type { PageServerLoad, Actions } from './$types';
import {
	getNoteByTitle,
	updateNote,
	getNoteBySlug,
	getUserByName,
	updateNoteLinks
} from '$lib/server/db';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const note = await getNoteByTitle(locals.user.id, params.username, params.notetitle);
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
			const content = formData.get('content')?.toString() || '';

			// Get user by username
			const userByName = await getUserByName(params.username);
			if (!userByName) {
				throw error(404, 'User not found');
			}

			// Get existing note
			const existingNote = await getNoteBySlug(userByName.id, params.username, params.notetitle);
			if (!existingNote) {
				throw error(404, 'Note not found');
			}

			// Check if the current user is the owner of the note
			if (existingNote.userId !== locals.user.id) {
				throw error(403, 'You do not have permission to edit this note');
			}

			// Update note
			const updatedNote = await updateNote(existingNote.id, locals.user.id, {
				title,
				content
			});

			// After updating the note, update its links
			await updateNoteLinks(existingNote.id, content, locals.user.id);

			// Redirect to the updated note page
			throw redirect(303, `/${params.username}/${updatedNote?.slug || params.notetitle}`);
		} catch (err) {
			if (err.status === 303) {
				throw err; // Re-throw redirects
			}
			console.error('Error updating note:', err);
			throw error(500, 'Failed to update note');
		}
	}
};
