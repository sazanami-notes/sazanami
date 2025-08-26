import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/connection';
import { notes, noteTags, tags } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { desc } from 'drizzle-orm';

export const load = async ({ parent }: { parent: () => Promise<{ session: any; user: any }> }) => {
	const { session, user } = await parent();

	// ログインしていないユーザーはトップページにリダイレクト
	if (!session) {
		throw redirect(302, '/');
	}

	// ログインしているユーザーのためのデータ取得
	const userNotes = await db
		.select()
		.from(notes)
		.where(eq(notes.userId, user.id))
		.orderBy(desc(notes.updatedAt));

	// Fetch all tags for the user
	const userTagsResult = await db
		.selectDistinct({ name: tags.name })
		.from(tags)
		.innerJoin(noteTags, eq(tags.id, noteTags.tagId))
		.innerJoin(notes, eq(noteTags.noteId, notes.id))
		.where(eq(notes.userId, user.id));

	const allTags = userTagsResult.map((t) => t.name);

	return {
		notes: userNotes,
		allTags,
		user,
		session
	};
};
