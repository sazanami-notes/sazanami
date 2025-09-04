import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { timeline, box } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { generateSlug } from '$lib/utils/slug';
import { ulid } from 'ulid';

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
		const body = await request.json();
		const { status } = body as { status: string };

		if (!status || !['active', 'box', 'archived', 'trash'].includes(status)) {
			return json({ message: 'Invalid status provided' }, { status: 400 });
		}

		const postArray = await db
			.select()
			.from(timeline)
			.where(and(eq(timeline.id, timelinePostId), eq(timeline.userId, session.user.id)))
			.limit(1);

		if (postArray.length === 0) {
			return json(
				{ message: 'Post not found or you do not have permission to edit it' },
				{ status: 404 }
			);
		}
		const timelinePost = postArray[0];

		if (status === 'box') {
			// Move to Box
			const title = timelinePost.content.split('\n')[0] || 'Untitled Note';
			const slug = generateSlug(title);

			await db.insert(box).values({
				id: ulid(),
				userId: session.user.id,
				title,
				slug,
				content: timelinePost.content,
				createdAt: new Date(),
				updatedAt: new Date()
			});

			await db.delete(timeline).where(eq(timeline.id, timelinePostId));

			return json({ success: true, message: 'Post moved to Box' });
		} else {
			// Update status in timeline
			if (timelinePost.status === status) {
				return json({ success: true, message: `Post is already in ${status}` });
			}

			await db
				.update(timeline)
				.set({
					status: status,
					updatedAt: new Date()
				})
				.where(and(eq(timeline.id, timelinePostId), eq(timeline.userId, session.user.id)));

			return json({ success: true, message: `Post moved to ${status}` });
		}
	} catch (error) {
		console.error('Error updating post status:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json({ message: `Internal Server Error: ${errorMessage}` }, { status: 500 });
	}
};

