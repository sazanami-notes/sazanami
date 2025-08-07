import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notes } from '$lib/server/db/schema';
import { eq, like, desc } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { generateSlug } from '$lib/utils/slug';

export const GET: RequestHandler = async ({ url, request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const titleQuery = url.searchParams.get('title');

	if (!titleQuery) {
		return json({ message: 'Title query parameter is required' }, { status: 400 });
	}

	try {
		// 部分一致検索のため、generateSlugで生成されたスラッグをlike検索
		// ただし、titleQueryはユーザーが入力したリンクテキストなので、そのままスラッグ化して検索する
		const searchSlug = generateSlug(titleQuery);

		const foundNotes = await db
			.select({
				id: notes.id,
				slug: notes.slug,
				title: notes.title
			})
			.from(notes)
			.where(like(notes.slug, `%${searchSlug}%`))
			.orderBy(desc(notes.updatedAt)); // 最新の更新を持つノートを優先

		if (foundNotes.length === 0) {
			return json({ message: 'Note not found' }, { status: 404 });
		}

		// 厳密な一致を優先し、その後部分一致、最後に最新のものを返す
		// generateSlugの結果が完全に一致するものを探す
		const exactMatch = foundNotes.find((note) => generateSlug(note.title) === searchSlug);

		if (exactMatch) {
			return json({
				username: session.user.name,
				title: exactMatch.title
			});
		} else {
			return json({
				username: session.user.name,
				title: foundNotes[0].title
			});
		}
	} catch (error) {
		console.error('Error resolving link:', error);
		return json({ message: 'Internal Server Error' }, { status: 500 });
	}
};
