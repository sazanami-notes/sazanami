import { db } from '$lib/server/db/connection';
import { error, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { notes } from '$lib/server/db/schema';
import { generateSlug } from '$lib/utils/slug';
import { ulid } from 'ulid';
import { getUserByName } from '$lib/server/db';

export const load = async ({ params, request, cookies }) => {
	console.log('Loading new note page for user:', params.username);
	
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

		// Ensure the username in the URL matches the logged-in user
		if (params.username !== sessionData.user.name) {
			console.log('Username mismatch, redirecting to correct URL');
			throw redirect(302, `/${sessionData.user.name}/new`);
		}

		console.log('New note page loaded successfully');
		return {
			user: sessionData.user
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
	default: async ({ request, params, cookies }) => {
		console.log('Processing new note form submission');
		
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
			const title = formData.get('title')?.toString() || 'Untitled Note';
			const content = formData.get('content')?.toString() || '';
			const isPublic = formData.get('isPublic') === 'on';

			console.log('Form data received - Title:', title, 'Content length:', content.length, 'Public:', isPublic);

			// Ensure the username in the URL matches the logged-in user
			if (params.username !== sessionData.user.name) {
				console.log('Username mismatch');
				throw error(403, 'You do not have permission to create notes for this user');
			}

			// Generate note ID and slug
			const noteId = ulid();
			const slug = generateSlug(title);
			const now = new Date();

			console.log('Creating note with ID:', noteId, 'Slug:', slug);

			// Create the note
			await db.insert(notes).values({
				id: noteId,
				userId: sessionData.user.id,
				title,
				content,
				slug,
				createdAt: now,
				updatedAt: now,
				isPublic
			});

			console.log('Note created successfully');
			
			// Redirect to the new note
			return redirect(303, `/${params.username}/${slug}`);
		} catch (err) {
			console.error('Error creating note:', err);
			if (err.status === 302 || err.status === 403) {
				throw err;
			}
			throw error(500, 'Failed to create note');
		}
	}
};
