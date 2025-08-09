import { db } from '$lib/server/db/connection';
import { error, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { notes } from '$lib/server/db/schema';
import { updateNoteLinks } from '$lib/server/db';
import { generateSlug } from '$lib/utils/slug';
import { ulid } from 'ulid';
import { getUserByName } from '$lib/server/db';

export const load = async ({ params, request, cookies, locals }) => {
	console.log('Loading new note page for user:', params.username);

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

		// Ensure the username in the URL matches the logged-in user
		if (params.username !== locals.user.name) {
			console.log('Username mismatch, redirecting to correct URL');
			throw redirect(302, `/${locals.user.name}/new`);
		}

		console.log('New note page loaded successfully');
		return {
			user: locals.user
		};
	} catch (err) {
		console.error('Error in new note page load:', err);
		if (err.status === 302) {
			throw err;
		}
		throw error(500, 'Failed to load new note page');
	}
};

export const actions = {
	default: async ({ request, params, cookies, locals }) => {
		console.log('Processing new note form submission');

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
			const title = formData.get('title')?.toString() || 'Untitled Note';
			const content = formData.get('content')?.toString() || '';
			const isPublic = formData.get('isPublic') === 'on';

			console.log(
				'Form data received - Title:',
				title,
				'Content length:',
				content.length,
				'Public:',
				isPublic
			);

			// Ensure the username in the URL matches the logged-in user
			if (params.username !== locals.user.name) {
				console.log('Username mismatch');
				throw error(403, 'You do not have permission to create notes for this user');
			}

			// Generate note ID and slug
			const noteId = ulid();
			let slug = generateSlug(title);

			// Make sure slug is not empty
			if (!slug || slug.trim() === '') {
				slug = `note-${noteId.toLowerCase().substring(0, 8)}`;
			}

			const now = new Date();

			console.log('Creating note with ID:', noteId, 'Slug:', slug);

			// Create the note
			await db.insert(notes).values({
				id: noteId,
				userId: locals.user.id,
				title,
				content,
				slug,
				createdAt: now,
				updatedAt: now,
				isPublic
			});

			// Update links table
			await updateNoteLinks(noteId, content, locals.user.id);

			console.log('Note created successfully');

			// Redirect to the new note
			throw redirect(303, `/${params.username}/${slug}`);
		} catch (err) {
			console.error('Error creating note:', err);
			if (err.status === 302 || err.status === 403) {
				throw err;
			}
			throw error(500, 'Failed to create note');
		}
	}
};
