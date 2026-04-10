import { redirect, type ServerLoad } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attachments } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '$lib/server/auth';

export const load: ServerLoad = async ({ request }) => {
	const sessionData = await auth.api.getSession({ headers: request.headers });

	if (!sessionData?.session) {
		throw redirect(302, '/login');
	}

	const items = await db
		.select()
		.from(attachments)
		.where(eq(attachments.userId, sessionData.user.id))
		.orderBy(desc(attachments.createdAt));

	return { attachments: items };
};
