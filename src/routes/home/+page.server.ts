import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { timeline } from '$lib/server/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async ({ request }) => {
	const sessionData = await auth.api.getSession({
		headers: request.headers
	});

	if (!sessionData?.user) {
		throw redirect(302, '/login');
	}

	const timelinePosts = await db
		.select()
		.from(timeline)
		.where(and(eq(timeline.userId, sessionData.user.id), eq(timeline.status, 'active')))
		.orderBy(desc(timeline.isPinned), desc(timeline.updatedAt))
		.limit(100);

	return {
		posts: timelinePosts,
		user: sessionData.user,
		session: sessionData.session
	};
};
