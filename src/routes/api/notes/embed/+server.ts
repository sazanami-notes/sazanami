import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { notes } from '$lib/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { getSessionCached } from '$lib/server/auth-session';
export const GET: RequestHandler = async ({ url, request }) => {
	const session = await getSessionCached(request.headers);
	if (!session?.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const title = url.searchParams.get('title');
	if (!title) {
		return json({ message: 'Title is required' }, { status: 400 });
	}

	try {
		// タイトルの大文字小文字無視の完全一致をDB側で絞る
		//（以前は全ノートの id/title/content を読み出してJSで探しており、
		//  埋め込みを含むノートを開くたびに本文全体を転送していた）
		const lowerTitle = title.toLowerCase();
		const rows = await db
			.select({ id: notes.id, title: notes.title, content: notes.content })
			.from(notes)
			.where(and(eq(notes.userId, session.user.id), eq(sql`lower(${notes.title})`, lowerTitle)))
			.limit(1);

		const note = rows[0];

		if (!note) {
			return json({ message: 'Note not found' }, { status: 404 });
		}

		return json({ id: note.id, title: note.title, content: note.content });
	} catch (error) {
		console.error('Error fetching embed note:', error);
		return json({ message: 'Internal Server Error' }, { status: 500 });
	}
};
