import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notes } from '$lib/server/db/schema';
import { eq, and, like, ne } from 'drizzle-orm';
import { auth } from '$lib/server/auth';

/**
 * GET /api/notes/suggestions?q=xxx
 * Boxノート（タイトル付き）の候補を返す。WikiLink入力補完用。
 */
export const GET: RequestHandler = async ({ url, request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
        return json({ message: 'Unauthorized' }, { status: 401 });
    }

    const q = url.searchParams.get('q') || '';
    const limit = 10;

    try {
        let results;
        if (q) {
            results = await db
                .select({ id: notes.id, title: notes.title, slug: notes.slug })
                .from(notes)
                .where(
                    and(
                        eq(notes.userId, session.session.userId),
                        eq(notes.status, 'box'),
                        ne(notes.title, ''),
                        like(notes.title, `%${q}%`)
                    )
                )
                .limit(limit);
        } else {
            results = await db
                .select({ id: notes.id, title: notes.title, slug: notes.slug })
                .from(notes)
                .where(
                    and(
                        eq(notes.userId, session.session.userId),
                        eq(notes.status, 'box'),
                        ne(notes.title, '')
                    )
                )
                .limit(limit);
        }

        return json(results);
    } catch (error) {
        console.error('Error fetching note suggestions:', error);
        return json({ message: 'Internal Server Error' }, { status: 500 });
    }
};
