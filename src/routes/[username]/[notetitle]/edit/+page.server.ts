import { getNoteBySlug, updateNote } from '$lib/server/db';
import { error, redirect } from '@sveltejs/kit';

export const load = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const note = await getNoteBySlug(locals.user.id, params.username, params.notetitle);
		if (!note) {
			throw error(404, 'Note not found');
		}
		return { note };
	} catch (err) {
		throw error(500, 'Failed to load note');
	}
};

export const actions = {
	default: async ({ request, params, locals }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const title = formData.get('title')?.toString() || '';
		const content = formData.get('content')?.toString() || '';

		try {
			// ノートのスラッグを取得（既存のノートから）
			const existingNote = await getNoteBySlug(locals.user.id, params.username, params.notetitle);
			if (!existingNote) {
				throw error(404, 'Note not found');
			}

			// ノートを更新
			const updatedNote = await updateNote(existingNote.id, locals.user.id, {
				title,
				content
			});

			// 更新後のノートページにリダイレクト
			return redirect(303, `/${params.username}/${updatedNote?.slug || params.notetitle}`);
		} catch (err) {
			throw error(500, 'Failed to update note');
		}
	}
};