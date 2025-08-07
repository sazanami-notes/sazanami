import { getNoteBySlug, updateNote, getUserByName } from '$lib/server/db';
import { error, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';

export const load = async ({ params, request, cookies, locals }) => {
	console.log('Loading edit page for note:', params.notetitle);
	
	try {
		// Get session data from locals (set in hooks.server.ts)
		const user = locals.user;
		
		// Fallback to getting session directly if not in locals
		if (!user) {
			console.log('User not in locals, getting session directly');
			const sessionData = await auth.api.getSession({
				headers: request.headers,
				cookies
			});
			
			if (!sessionData?.session) {
				console.log('No session, redirecting to login');
				throw redirect(302, '/login');
			}
			
			// Use the user from the session
			locals.user = sessionData.user;
		}
		
		if (!locals.user) {
			console.log('Still no user after fallback, redirecting to login');
			throw redirect(302, '/login');
		}
		
		console.log('User found:', locals.user.name);

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
		if (note.userId !== locals.user.id) {
			console.log('User does not own this note');
			throw error(403, 'You do not have permission to edit this note');
		}

		console.log('Note loaded successfully');
		return { note, user: locals.user };
	} catch (err) {
		console.error('Error in edit page load:', err);
		if (err.status === 302 || err.status === 403 || err.status === 404) {
			throw err;
		}
		throw error(500, 'Failed to load note');
	}
};

export const actions = {
	default: async ({ request, params, cookies, locals }) => {
		console.log('Processing edit form submission');
		
		try {
			// Get user from locals (set in hooks.server.ts)
			const user = locals.user;
			
			// Fallback to getting session directly if not in locals
			if (!user) {
				console.log('User not in locals, getting session directly');
				const sessionData = await auth.api.getSession({
					headers: request.headers,
					cookies
				});
				
				if (!sessionData?.session) {
					console.log('No session, redirecting to login');
					throw redirect(302, '/login');
				}
				
				// Use the user from the session
				locals.user = sessionData.user;
			}
			
			if (!locals.user) {
				console.log('Still no user after fallback, redirecting to login');
				throw redirect(302, '/login');
			}
			
			console.log('User found:', locals.user.name);

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
			if (existingNote.userId !== locals.user.id) {
				console.log('User does not own this note');
				throw error(403, 'You do not have permission to edit this note');
			}

			// Update note
			console.log('Updating note...');
			const updatedNote = await updateNote(existingNote.id, locals.user.id, {
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