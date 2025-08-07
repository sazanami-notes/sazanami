import { db } from '$lib/server/db/connection';
import { error, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { notes } from '$lib/server/db/schema';
import { generateSlug } from '$lib/utils/slug';
import { ulid } from 'ulid';

export const load = async ({ params, request }) => {
	const sessionData = await auth.api.getSession({
		headers: request.headers
	});

	if (!sessionData?.session) {
		throw redirect(302, '/login');
	}

	// Ensure the username in the URL matches the logged-in user
	if (params.username !== sessionData.user.name) {
		throw redirect(302, `/${sessionData.user.name}/new`);
	}

	return {
		user: sessionData.user
	};
};

export const actions = {
	default: async ({ request, params }) => {
		const sessionData = await auth.api.getSession({
			headers: request.headers
		});

		if (!sessionData?.session) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const title = formData.get('title')?.toString() || 'Untitled Note';
		const content = formData.get('content')?.toString() || '';
		const isPublic = formData.get('isPublic') === 'on';

		try {
			const noteId = ulid();
			const slug = generateSlug(title);
			const now = new Date();

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

			// Redirect to the new note
			return redirect(303, `/${params.username}/${slug}`);
		} catch (err) {
			console.error('Failed to create note:', err);
			throw error(500, 'Failed to create note');
		}
	}
};
