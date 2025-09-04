import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { timeline } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, params }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const timelinePostId = params.id;
	if (!timelinePostId) {
		return json({ message: 'Post ID is required' }, { status: 400 });
	}

	try {
		const postArray = await db
			.select({ isPinned: timeline.isPinned })
			.from(timeline)
			.where(and(eq(timeline.id, timelinePostId), eq(timeline.userId, session.user.id)))
			.limit(1);

		if (postArray.length === 0) {
			return json(
				{ message: 'Post not found or you do not have permission to edit it' },
				{ status: 404 }
			);
		}
		const currentPost = postArray[0];
		const newPinnedState = !currentPost.isPinned;
		const now = new Date();

		await db
			.update(timeline)
			.set({
				isPinned: newPinnedState,
				updatedAt: now
			})
			.where(and(eq(timeline.id, timelinePostId), eq(timeline.userId, session.user.id)));

		return json({ success: true, isPinned: newPinnedState });
	} catch (error) {
		console.error('Error toggling pin status:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json({ message: `Internal Server Error: ${errorMessage}` }, { status: 500 });
	}
};
