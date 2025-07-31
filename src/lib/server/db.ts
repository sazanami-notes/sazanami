import { drizzle } from 'drizzle-orm/libsql';
import { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } from '$env/static/private';
import * as schema from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { notes, tags, noteTags } from '$lib/server/db/schema';
import type { Note } from '$lib/types';

export const db = drizzle({ connection: {
	url: TURSO_DATABASE_URL, 
	authToken: TURSO_AUTH_TOKEN 
  }});

/**
 * IDとユーザーIDでノートを取得する関数
 * @param noteId ノートID
 * @param userId ユーザーID
 * @returns ノートオブジェクトまたはnull
 */
export async function getNoteById(noteId: string, userId: string): Promise<Note | null> {
	try {
		const note = await db
			.select()
			.from(notes)
			.where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
			.limit(1);

		if (note.length === 0) {
			return null;
		}

		// タグを取得
		const noteTagsList = await db
			.select({ name: tags.name })
			.from(noteTags)
			.leftJoin(tags, eq(noteTags.tagId, tags.id))
			.where(eq(noteTags.noteId, noteId));

		return {
			id: note[0].id,
			userId: note[0].userId,
			title: note[0].title,
			slug: note[0].slug,
			content: note[0].content ?? '',
			createdAt: new Date(note[0].createdAt),
			updatedAt: new Date(note[0].updatedAt),
			isPublic: note[0].isPublic,
			tags: noteTagsList.map(nt => nt.name).filter(Boolean) as string[]
		};
	} catch (error) {
		console.error('Error fetching note:', error);
		return null;
	}
}
