import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { notes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth';

export const GET: RequestHandler = async ({ url, request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
        return json({ message: 'Unauthorized' }, { status: 401 });
    }

    const title = url.searchParams.get('title');
    if (!title) {
        return json({ message: 'Title is required' }, { status: 400 });
    }

    try {
        // ユーザーのすべてのノートを取得してタイトルを大文字小文字無視で検索
        const userNotes = await db
            .select({ id: notes.id, title: notes.title, content: notes.content })
            .from(notes)
            .where(eq(notes.userId, session.user.id));

        const lowerTitle = title.toLowerCase();
        const note = userNotes.find((n) => n.title?.toLowerCase() === lowerTitle);

        if (!note) {
            return json({ message: 'Note not found' }, { status: 404 });
        }

        return json({ content: note.content });
    } catch (error) {
        console.error('Error fetching embed note:', error);
        return json({ message: 'Internal Server Error' }, { status: 500 });
    }
};
