import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { box } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { generateSlug } from '$lib/utils/slug';

export const GET: RequestHandler = async ({ url, request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const titleQuery = url.searchParams.get('title');

	if (!titleQuery) {
		return json({ message: 'Title query parameter is required' }, { status: 400 });
	}

	try {
		const searchSlug = generateSlug(titleQuery);

		const foundNotes = await db
			.select({
				id: box.id,
				slug: box.slug,
				title: box.title
			})
			.from(box)
			.where(and(eq(box.userId, session.user.id), eq(box.slug, searchSlug)))
			.orderBy(desc(box.updatedAt));

		if (foundNotes.length === 0) {
			return json({ message: 'Note not found' }, { status: 404 });
		}

		const latestNote = foundNotes[0];

		return json({
			id: latestNote.id,
			slug: latestNote.slug,
			title: latestNote.title,
			username: session.user.name
		});
	} catch (error) {
		console.error('Error resolving link:', error);
		return json({ message: 'Internal Server Error' }, { status: 500 });
	}
};
