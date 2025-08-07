import { notes, user } from './db/schema';
import { eq, and } from 'drizzle-orm';
import { ulid } from 'ulid';
import type { Note } from '$lib/types';
import { generateSlug } from '$lib/utils/slug';

// Import the database connection from the connection file in the db directory
import { db } from './db/connection';

// Export the database connection for other modules to use
export { db };

// Get user by username
export const getUserByName = async (username: string) => {
  const result = await db
    .select()
    .from(user)
    .where(eq(user.name, username))
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

export const getNoteBySlug = async (userId: string, username: string, slug: string) => {
	const userNotes = await db.select().from(notes).where(eq(notes.userId, userId));

	const note = userNotes.find(
		(note: typeof notes.$inferSelect) => generateSlug(note.title) === slug
	);

	return note || null;
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
