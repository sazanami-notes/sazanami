import { noteLinks, notes, user } from './db/schema';
import { eq, and, inArray } from 'drizzle-orm';
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

export const updateNote = async (
	id: string,
	userId: string,
	updates: Partial<Omit<Note, 'id' | 'userId'>>
) => {
	const updatedNote = {
		...updates,
		updatedAt: new Date()
	};

	await db
		.update(notes)
		.set(updatedNote)
		.where(and(eq(notes.id, id), eq(notes.userId, userId)));

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
export const updateNoteLinks = async (sourceNoteId: string, content: string, userId: string) => {
	// 1. Parse content to extract wiki link titles
	const linkedTitles = extractWikiLinks(content);

	// 2. Find the corresponding notes for each link title
	let targetNotes: { id: string }[] = [];
	if (linkedTitles.length > 0) {
		const linkedSlugs = linkedTitles.map(generateSlug);
		targetNotes = await db
			.select({ id: notes.id })
			.from(notes)
			.where(and(eq(notes.userId, userId), inArray(notes.slug, linkedSlugs)));
	}
	const targetNoteIds = targetNotes.map((n) => n.id);

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
};
