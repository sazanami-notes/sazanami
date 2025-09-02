import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { timeline, notes } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request }) => {
	const sessionData = await auth.api.getSession({
		headers: request.headers
	});

	if (!sessionData?.session) {
		throw redirect(302, '/login');
	}

	const timelineEvents = await db
		.select({
			id: timeline.id,
			type: timeline.type,
			createdAt: timeline.createdAt,
			metadata: timeline.metadata,
			note: {
				id: notes.id,
				title: notes.title,
				slug: notes.slug
			}
		})
		.from(timeline)
		.leftJoin(notes, eq(timeline.noteId, notes.id))
		.where(eq(timeline.userId, sessionData.user.id))
		.orderBy(desc(timeline.createdAt))
		.limit(100);

	return {
		timelineEvents,
		user: sessionData.user,
		session: sessionData.session
	};
};
