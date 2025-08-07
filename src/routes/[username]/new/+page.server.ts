import { db } from '$lib/server/db/connection';
import { error, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { notes } from '$lib/server/db/schema';
import { generateSlug } from '$lib/utils/slug';
import { ulid } from 'ulid';
import { getUserByName } from '$lib/server/db';

export const load = async ({ params, request, cookies, locals }) => {
	console.log('Loading new note page for user:', params.username);
	console.log('Request headers:', Object.fromEntries(request.headers.entries()));
	console.log('Cookies available:', cookies.getAll().map(c => c.name).join(', '));
	
	try {
		// Get session data directly from auth API
		console.log('Getting session directly from auth API');
		const sessionData = await auth.api.getSession({
			headers: request.headers,
			cookies
		});
		
		console.log('Session data result:', sessionData ? 'Found' : 'Not found');
		
		if (!sessionData?.session) {
			console.log('No session, redirecting to login');
			throw redirect(302, '/login');
		}
		
		// Always use the user from the direct session check
		const user = sessionData.user;
		
		if (!user) {
			console.log('No user in session, redirecting to login');
			throw redirect(302, '/login');
		}
		
		console.log('User found:', user.name);

		// Ensure the username in the URL matches the logged-in user
		if (params.username !== user.name) {
			console.log('Username mismatch, redirecting to correct URL');
			throw redirect(302, `/${user.name}/new`);
		}

		console.log('New note page loaded successfully');
		return {
			user
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
		console.log('Request headers:', Object.fromEntries(request.headers.entries()));
		console.log('Cookies available:', cookies.getAll().map(c => c.name).join(', '));
		
		try {
			// Get session data directly from auth API
			console.log('Getting session directly from auth API');
			const sessionData = await auth.api.getSession({
				headers: request.headers,
				cookies
			});
			
			console.log('Session data result:', sessionData ? 'Found' : 'Not found');
			
			if (!sessionData?.session) {
				console.log('No session, redirecting to login');
				throw redirect(302, '/login');
			}
			
			// Always use the user from the direct session check
			const user = sessionData.user;
			
			if (!user) {
				console.log('No user in session, redirecting to login');
				throw redirect(302, '/login');
			}
			
			console.log('User found:', user.name);

			// Get form data
			const formData = await request.formData();
			const title = formData.get('title')?.toString() || 'Untitled Note';
			const content = formData.get('content')?.toString() || '';
			const isPublic = formData.get('isPublic') === 'on';

			console.log('Form data received - Title:', title, 'Content length:', content.length, 'Public:', isPublic);

			// Ensure the username in the URL matches the logged-in user
			if (params.username !== user.name) {
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
				userId: user.id,
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
