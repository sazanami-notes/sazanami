import { getNoteBySlug, updateNote, getUserByName } from '$lib/server/db';
import { error, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';

export const load = async ({ params, request, cookies }) => {
	console.log('Loading edit page for note:', params.notetitle);
	
	try {
		// Get session data
		const sessionData = await auth.api.getSession({
			headers: request.headers,
			cookies
		});

		console.log('Session data:', sessionData ? 'Found' : 'Not found');

		if (!sessionData?.session) {
			console.log('No session, redirecting to login');
			throw redirect(302, '/login');
		}

		// Get user by username
		const userByName = await getUserByName(params.username);
		if (!userByName) {
			console.log('User not found:', params.username);
			throw error(404, 'User not found');
		}

		// Get note by slug
		const note = await getNoteBySlug(userByName.id, params.username, params.notetitle);
		if (!note) {
			console.log('Note not found:', params.notetitle);
			throw error(404, 'Note not found');
		}

		// Check if the current user is the owner of the note
		if (note.userId !== sessionData.user.id) {
			console.log('User does not own this note');
			throw error(403, 'You do not have permission to edit this note');
		}

		console.log('Note loaded successfully');
		return { note, user: sessionData.user };
	} catch (err) {
		console.error('Error in edit page load:', err);
		if (err.status === 302 || err.status === 403 || err.status === 404) {
			throw err;
		}
		throw error(500, 'Failed to load note');
	}
};

export const actions = {
	default: async ({ request, params, cookies }) => {
		console.log('Processing edit form submission');
		
		try {
			// Get session data
			const sessionData = await auth.api.getSession({
				headers: request.headers,
				cookies
			});

			if (!sessionData?.session) {
				console.log('No session, redirecting to login');
				throw redirect(302, '/login');
			}

			// Get form data
			const formData = await request.formData();
			const title = formData.get('title')?.toString() || '';
			const content = formData.get('content')?.toString() || '';

			console.log('Form data received - Title:', title, 'Content length:', content.length);

			// Get user by username
			const userByName = await getUserByName(params.username);
			if (!userByName) {
				console.log('User not found:', params.username);
				throw error(404, 'User not found');
			}

			// Get existing note
			const existingNote = await getNoteBySlug(userByName.id, params.username, params.notetitle);
			if (!existingNote) {
				console.log('Note not found:', params.notetitle);
				throw error(404, 'Note not found');
			}

			// Check if the current user is the owner of the note
			if (existingNote.userId !== sessionData.user.id) {
				console.log('User does not own this note');
				throw error(403, 'You do not have permission to edit this note');
			}

			// Update note
			console.log('Updating note...');
			const updatedNote = await updateNote(existingNote.id, sessionData.user.id, {
				title,
				content
			});

			console.log('Note updated successfully');
			
			// Redirect to the updated note page
			return redirect(303, `/${params.username}/${updatedNote?.slug || params.notetitle}`);
		} catch (err) {
			console.error('Error updating note:', err);
			if (err.status === 302 || err.status === 403 || err.status === 404) {
				throw err;
			}
			throw error(500, 'Failed to update note');
		}
	}
};