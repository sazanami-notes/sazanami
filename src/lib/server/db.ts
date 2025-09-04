import { box, boxLinks, timeline, user } from './db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { ulid } from 'ulid';
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

export const getBoxNoteById = async (userId: string, id: string) => {
	const result = await db
		.select()
		.from(box)
		.where(and(eq(box.id, id), eq(box.userId, userId)))
		.limit(1);

	return result[0] || null;
};

export const getBoxNoteBySlug = async (userId: string, slug: string) => {
	const result = await db
		.select()
		.from(box)
		.where(and(eq(box.userId, userId), eq(box.slug, slug)))
		.limit(1);

	return result[0] || null;
};

export const updateBoxLinks = async (sourceBoxId: string, content: string, userId: string) => {
	const linkedTitles = extractWikiLinks(content);

	let targetBoxNotes: { id: string }[] = [];
	if (linkedTitles.length > 0) {
		const linkedSlugs = linkedTitles.map(generateSlug);
		targetBoxNotes = await db
			.select({ id: box.id })
			.from(box)
			.where(and(eq(box.userId, userId), inArray(box.slug, linkedSlugs)));
	}
	const targetBoxIds = targetBoxNotes.map((n) => n.id);

	await db.delete(boxLinks).where(eq(boxLinks.sourceBoxId, sourceBoxId));

	if (targetBoxIds.length > 0) {
		const newLinks = targetBoxIds.map((targetBoxId) => ({
			id: ulid(),
			sourceBoxId,
			targetBoxId,
			createdAt: new Date()
		}));
		await db.insert(boxLinks).values(newLinks);
	}
};

