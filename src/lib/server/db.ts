import { noteLinks, notes, user } from './db/schema';
import { eq, and, ne, inArray } from 'drizzle-orm';
import { ulid } from 'ulid';
import type { Note } from '$lib/types';
import { generateSlug } from '$lib/utils/slug';
import { extractWikiLinks } from '$lib/utils/note-utils';

// Import the database connection from the connection file in the db directory
import { db } from './db/connection';

// Export the database connection for other modules to use
export { db };

// Get user by username
export const getUserByName = async (username: string) => {
	const result = await db.select().from(user).where(eq(user.name, username)).limit(1);

	return result[0] || null;
};

export const getNoteByTitle = async (userId: string, title: string) => {
	const result = await db
		.select()
		.from(notes)
		.where(and(eq(notes.userId, userId), eq(notes.title, title)))
		.limit(1);

	return result[0] || null;
};

export const getNoteById = async (userId: string, id: string) => {
	const result = await db
		.select()
		.from(notes)
		.where(and(eq(notes.id, id), eq(notes.userId, userId)))
		.limit(1);

	return result[0] || null;
};

export const getNoteBySlug = async (userId: string, slug: string) => {
	const result = await db
		.select()
		.from(notes)
		.where(and(eq(notes.userId, userId), eq(notes.slug, slug)))
		.limit(1);

	return result[0] || null;
};

export const createNote = async (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'slug'>) => {
	const newNote = {
		...note,
		id: ulid(),
		slug: generateSlug(note.title),
		createdAt: new Date(),
		updatedAt: new Date()
	};

	await db.insert(notes).values(newNote);
	return newNote;
};

/**
 * タイトルが変更された場合、このノートへリンクしている他のノートの本文内のWikiLinkを一括置換する
 */
export const updateBacklinksOnTitleChange = async (
	noteId: string,
	oldTitle: string,
	newTitle: string,
	userId: string
) => {
	// このノートにリンクしている(被リンク)ノートのIDを取得
	const links = await db.select().from(noteLinks).where(eq(noteLinks.targetNoteId, noteId));
	const sourceNoteIds = links.map((l) => l.sourceNoteId);

	if (sourceNoteIds.length > 0) {
		const sourceNotes = await db.select().from(notes).where(inArray(notes.id, sourceNoteIds));

		for (const sourceNote of sourceNotes) {
			if (sourceNote.content) {
				// 正規表現のエスケープ用関数
				const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

				// 大文字小文字を区別せず、[[oldTitle]] を [[newTitle]] に置換
				const regex = new RegExp(`\\[\\[${escapeRegExp(oldTitle)}\\]\\]`, 'gi');
				const newContent = sourceNote.content.replace(regex, `[[${newTitle}]]`);

				if (newContent !== sourceNote.content) {
					// 本文を更新
					await db
						.update(notes)
						.set({
							contentHtml: newContent,
							updatedAt: new Date()
						})
						.where(eq(notes.id, sourceNote.id));

					// 拡張子つきやIDマップなど、リンク情報を再計算して更新
					await updateNoteLinks(sourceNote.id, newContent, userId);
				}
			}
		}
	}
};

export const updateNote = async (
	id: string,
	userId: string,
	updates: Partial<Omit<Note, 'id' | 'userId'>>
) => {
	let oldNote = null;
	if (updates.title) {
		oldNote = await getNoteById(userId, id);
	}

	const updatedNote = {
		...updates,
		updatedAt: new Date()
	};

	await db
		.update(notes)
		.set(updatedNote)
		.where(and(eq(notes.id, id), eq(notes.userId, userId)));

	// タイトルが変更された場合、このノートへリンクしている他のノートの本文内のWikiLinkを更新する
	if (oldNote && updates.title !== undefined && oldNote.title !== updates.title && oldNote.title) {
		await updateBacklinksOnTitleChange(id, oldNote.title, updates.title, userId);
	}

	return getNoteById(userId, id);
};

export const deleteNote = async (id: string, userId: string) => {
	await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
};

/**
 * Updates the links for a given note based on its content.
 * This involves parsing [[wiki links]], finding target notes, and updating the note_links table.
 * @param sourceNoteId The ID of the note being updated.
 * @param content The new content of the note.
 * @param userId The ID of the user who owns the note.
 */
export const updateNoteLinks = async (sourceNoteId: string, contentHtml: string, userId: string) => {
	// 1. Parse content to extract wiki link titles
	const linkedTitles = extractWikiLinks(content);

	// 2. Find the corresponding notes for each link title
	let targetNotes: { id: string; title: string }[] = [];
	if (linkedTitles.length > 0) {
		// ユーザーの全Boxノートを取得（性能上、数千件程度なら問題なし）
		const allUserNotes = await db
			.select({ id: notes.id, title: notes.title })
			.from(notes)
			.where(and(eq(notes.userId, userId), ne(notes.title, '')));

		const lowerLinkedTitles = new Set(linkedTitles.map((t) => t.toLowerCase()));
		targetNotes = allUserNotes.filter(
			(n) => n.title && lowerLinkedTitles.has(n.title.toLowerCase())
		);
	}
	const targetNoteIds = targetNotes.map((n) => n.id);

	// Create a mapping of Title -> ID for unresolved link rendering (Case-insensitive)
	const resolvedLinksMap: Record<string, string> = {};
	targetNotes.forEach((n) => {
		if (n.title) {
			resolvedLinksMap[n.title.toLowerCase()] = n.id;
		}
	});

	// 3. Delete all existing links from this source note
	await db.delete(noteLinks).where(eq(noteLinks.sourceNoteId, sourceNoteId));

	// 4. Insert new links
	if (targetNoteIds.length > 0) {
		const newLinks = targetNoteIds.map((targetNoteId) => ({
			sourceNoteId,
			targetNoteId,
			createdAt: new Date()
		}));
		await db.insert(noteLinks).values(newLinks);
	}

	// 5. Update the source note with the resolved links mapping
	await db
		.update(notes)
		.set({
			resolvedLinks: JSON.stringify(resolvedLinksMap)
		})
		.where(eq(notes.id, sourceNoteId));
};
