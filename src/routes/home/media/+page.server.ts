import { redirect, type ServerLoad } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attachments } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSessionCached } from '$lib/server/auth-session';
export const load: ServerLoad = async ({ request }) => {
	const sessionData = await getSessionCached(request.headers);

	if (!sessionData?.session) {
		throw redirect(302, '/login');
	}

	const items = await db
		.select()
		.from(attachments)
		.where(eq(attachments.userId, sessionData.user.id))
		.orderBy(desc(attachments.createdAt))
		// 全件読み込みはメモリを圧迫するので上限を設ける（必要ならページングを追加する）
		.limit(300);

	return { attachments: items };
};
