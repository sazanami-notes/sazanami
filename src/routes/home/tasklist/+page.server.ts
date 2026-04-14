import { redirect, type ServerLoad } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notes, noteTags, tags } from '$lib/server/db/schema';
import { and, eq, desc, sql, like, or } from 'drizzle-orm';
import { auth } from '$lib/server/auth';

export const load: ServerLoad = async ({ request, url }) => {
    const sessionData = await auth.api.getSession({
        headers: request.headers
    });

    if (!sessionData?.session) {
        throw redirect(302, '/login');
    }

    const notesResult = await db
        .select({
            id: notes.id,
            title: notes.title,
            contentHtml: notes.contentHtml,
            updatedAt: notes.updatedAt,
            isPinned: notes.isPinned,
            userId: notes.userId,
            createdAt: notes.createdAt,
            isPublic: notes.isPublic,
            slug: notes.slug,
            status: notes.status,
            tags: sql<string>`GROUP_CONCAT(${tags.name})`.as('tags')
        })
        .from(notes)
        .leftJoin(noteTags, eq(notes.id, noteTags.noteId))
        .leftJoin(tags, eq(noteTags.tagId, tags.id))
        .where(
            and(
                eq(notes.userId, sessionData.user.id),
                eq(notes.status, 'inbox'),
                or(
                    like(notes.contentHtml, '%data-type="taskList"%'),
                    like(notes.contentHtml, '%data-type="taskItem"%'),
                    like(notes.contentHtml, '%- [ ] %'),
                    like(notes.contentHtml, '%- [x] %'),
                    like(notes.contentHtml, '%- [X] %'),
                    like(notes.contentHtml, '%* [ ] %'),
                    like(notes.contentHtml, '%* [x] %'),
                    like(notes.contentHtml, '%* [X] %'),
                    like(notes.contentHtml, '%+ [ ] %'),
                    like(notes.contentHtml, '%+ [x] %'),
                    like(notes.contentHtml, '%+ [X] %')
                )
            )
        )
        .groupBy(notes.id)
        .orderBy(desc(notes.isPinned), desc(notes.updatedAt))
        .limit(100);

    const notesWithTags = notesResult.map((note) => ({
        ...note,
        title: note.title ?? '',
        contentHtml: note.contentHtml ?? '',
        tags: note.tags ? note.tags.split(',') : []
    }));

    return {
        notes: notesWithTags,
        user: sessionData.user,
        session: sessionData.session
    };
};
