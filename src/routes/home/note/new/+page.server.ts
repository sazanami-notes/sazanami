import { db } from '$lib/server/db/connection';
import { error, redirect, isRedirect } from '@sveltejs/kit';
import { notes, timeline } from '$lib/server/db/schema';
import { updateNoteLinks } from '$lib/server/db';
import { generateSlug } from '$lib/utils/slug';
import { ulid } from 'ulid';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		try {
			const formData = await request.formData();
			let title = formData.get('title')?.toString();
			const content = formData.get('content')?.toString() || '';
			const isPublic = formData.get('isPublic') === 'on';

			if (title === undefined || title.trim() === '') {
				const firstLine = content.split('\n')[0] || '';
				const plainTextFirstLine = firstLine.replace(/<[^>]*>/g, '').trim();
				title = plainTextFirstLine.substring(0, 50) || 'Untitled Note';
			} else {
				title = title.trim() || 'Untitled Note';
			}

			const noteId = ulid();
			let slug = generateSlug(title);

			if (!slug || slug.trim() === '') {
				slug = `note-${noteId.toLowerCase().substring(0, 8)}`;
			}

			const now = new Date();

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

			await db.insert(timeline).values({
				userId: locals.user.id,
				noteId: noteId,
				type: 'note_created',
				createdAt: now
			});

			await updateNoteLinks(noteId, content, locals.user.id);

			throw redirect(303, `/home/note/${noteId}`);
		} catch (err) {
			if (isRedirect(err)) {
				throw err;
			}
			if (err instanceof Error && 'status' in err && err.status === 401) {
				throw err;
			}
			console.error('Error creating note:', err);
			throw error(500, 'Failed to create note');
		}
	}
};
