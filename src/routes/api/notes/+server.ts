import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { timeline } from '$lib/server/db/schema';
import { eq, or, like, desc, sql, and } from 'drizzle-orm';
import { ulid } from 'ulid';
import { auth } from '$lib/server/auth';

export const GET: RequestHandler = async ({ url, request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const search = url.searchParams.get('search') || '';
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '20');
	const offset = (page - 1) * limit;

	try {
		let timelinePosts;

		if (search) {
			timelinePosts = await db
				.select()
				.from(timeline)
				.where(and(eq(timeline.userId, session.user.id), like(timeline.content, `%${search}%`)))
				.orderBy(desc(timeline.updatedAt))
				.limit(limit)
				.offset(offset);
		} else {
			timelinePosts = await db
				.select()
				.from(timeline)
				.where(eq(timeline.userId, session.user.id))
				.orderBy(desc(timeline.updatedAt))
				.limit(limit)
				.offset(offset);
		}

		let totalCount;
		if (search) {
			totalCount = await db
				.select({ count: sql<number>`COUNT(*)` })
				.from(timeline)
				.where(and(eq(timeline.userId, session.user.id), like(timeline.content, `%${search}%`)));
		} else {
			totalCount = await db
				.select({ count: sql<number>`COUNT(*)` })
				.from(timeline)
				.where(eq(timeline.userId, session.user.id));
		}

		return json({
			posts: timelinePosts,
			pagination: {
				page,
				limit,
				total: totalCount[0].count,
				totalPages: Math.ceil(totalCount[0].count / limit)
			}
		});
	} catch (error) {
		console.error('Error fetching timeline posts:', error);
		return json({ message: 'Internal Server Error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return json({ message: 'Unauthorized - No session found' }, { status: 401 });
	}

	try {
		const body = await request.json();

		if (typeof body !== 'object' || body === null) {
			return json({ message: 'Invalid request body' }, { status: 400 });
		}
		const { content } = body as { content?: string };

		if (!content) {
			return json({ message: 'Content is required' }, { status: 400 });
		}

		const now = new Date();
		const postId = ulid();

		await db.insert(timeline).values({
			id: postId,
			userId: session.user.id,
			content: content,
			createdAt: now,
			updatedAt: now
		});

		const newPost = await db.select().from(timeline).where(eq(timeline.id, postId)).limit(1);

		return json(newPost[0], { status: 201 });
	} catch (error) {
		console.error('Error creating post:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json({ message: `Internal Server Error: ${errorMessage}` }, { status: 500 });
	}
};
