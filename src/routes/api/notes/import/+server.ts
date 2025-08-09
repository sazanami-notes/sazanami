import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createNote, updateNoteLinks } from '$lib/server/db';
import { auth } from '$lib/server/auth';
import path from 'path';

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}
	const userId = session.user.id;

	try {
		const formData = await request.formData();
		const files = formData.getAll('files') as File[];

		if (files.length === 0) {
			return json({ message: 'No files uploaded' }, { status: 400 });
		}

		let importedCount = 0;

		for (const file of files) {
			if (file.type !== 'text/markdown' && !file.name.endsWith('.md')) {
				console.warn(`Skipping non-markdown file: ${file.name}`);
				continue;
			}

			try {
				const title = path.basename(file.name, path.extname(file.name));
				const content = await file.text();

				const newNote = await createNote({
					userId,
					title,
					content
				});

				await updateNoteLinks(newNote.id, content, userId);

				importedCount++;
			} catch (e) {
				console.error(`Failed to import file: ${file.name}`, e);
			}
		}

		return json(
			{
				success: true,
				importedCount
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error handling file import:', error);
		return json({ message: 'Internal Server Error' }, { status: 500 });
	}
};
