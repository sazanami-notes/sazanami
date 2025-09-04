import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/connection';
import { box, boxTags, tags } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ request }) => {
	const sessionData = await auth.api.getSession({
		headers: request.headers
	});

	if (!sessionData?.user) {
		throw redirect(302, '/login');
	}

	const userNotes = await db
		.select()
		.from(box)
		.where(eq(box.userId, sessionData.user.id))
		.orderBy(desc(box.updatedAt));

	const userTagsResult = await db
		.selectDistinct({ name: tags.name })
		.from(tags)
		.innerJoin(boxTags, eq(tags.id, boxTags.tagId))
		.innerJoin(box, eq(boxTags.boxId, box.id))
		.where(eq(box.userId, sessionData.user.id));

	const allTags = userTagsResult.map((t) => t.name);

	return {
		notes: userNotes,
		allTags,
		user: sessionData.user
	};
};
