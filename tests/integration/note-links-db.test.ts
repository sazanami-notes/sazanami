import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { box as boxSchema, user as userSchema, boxLinks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { updateBoxLinks } from '$lib/server/db'; // Using db functions directly
import { generateSlug } from '$lib/utils/slug';

const testUser = {
	id: ulid(),
	name: 'notelinkdbuser',
	email: 'notelinkdb@example.com'
};

let noteIds: Record<string, string> = {};

async function createBoxNote(note: { userId: string; title: string; content: string }) {
	const newNote = {
		...note,
		id: ulid(),
		slug: generateSlug(note.title),
		createdAt: new Date(),
		updatedAt: new Date()
	};
	await db.insert(boxSchema).values(newNote);
	return newNote;
}

beforeAll(async () => {
	await db.insert(userSchema).values({
		id: testUser.id,
		name: testUser.name,
		email: testUser.email,
		// emailVerified: true
	});

	const noteA = await createBoxNote({
		userId: testUser.id,
		title: 'Target A',
		content: '...'
	});
	const noteB = await createBoxNote({
		userId: testUser.id,
		title: 'Target B',
		content: '...'
	});
	noteIds['Target A'] = noteA.id;
	noteIds['Target B'] = noteB.id;
});

afterAll(async () => {
	await db.delete(boxLinks);
	await db.delete(boxSchema).where(eq(boxSchema.userId, testUser.id));
	await db.delete(userSchema).where(eq(userSchema.id, testUser.id));
});

describe('box_links table update logic', () => {
	it('should create a link when a new note with a wiki link is created', async () => {
		const sourceNote = await createBoxNote({
			userId: testUser.id,
			title: 'Source Note 1',
			content: 'This links to [[Target A]].'
		});
		await updateBoxLinks(sourceNote.id, sourceNote.content || '', testUser.id);

		const links = await db
			.select()
			.from(boxLinks)
			.where(eq(boxLinks.sourceBoxId, sourceNote.id));

		expect(links).toHaveLength(1);
		expect(links[0].targetBoxId).toBe(noteIds['Target A']);
	});

	it('should update links when a note content is changed', async () => {
		const sourceNote = await createBoxNote({
			userId: testUser.id,
			title: 'Source Note 2',
			content: 'Initial link to [[Target A]].'
		});
		await updateBoxLinks(sourceNote.id, sourceNote.content || '', testUser.id);

		const newContent = 'Now it links to [[Target B]].';
		await db.update(boxSchema).set({ content: newContent }).where(eq(boxSchema.id, sourceNote.id));
		await updateBoxLinks(sourceNote.id, newContent, testUser.id);

		const links = await db
			.select()
			.from(boxLinks)
			.where(eq(boxLinks.sourceBoxId, sourceNote.id));

		expect(links).toHaveLength(1);
		expect(links[0].targetBoxId).toBe(noteIds['Target B']);
	});

	it('should remove all links if the updated note has no links', async () => {
		const sourceNote = await createBoxNote({
			userId: testUser.id,
			title: 'Source Note 3',
			content: 'This will have its link removed. [[Target A]]'
		});
		await updateBoxLinks(sourceNote.id, sourceNote.content || '', testUser.id);

		let links = await db.select().from(boxLinks).where(eq(boxLinks.sourceBoxId, sourceNote.id));
		expect(links).toHaveLength(1);

		const newContent = 'The link is gone.';
		await db.update(boxSchema).set({ content: newContent }).where(eq(boxSchema.id, sourceNote.id));
		await updateBoxLinks(sourceNote.id, newContent, testUser.id);

		links = await db.select().from(boxLinks).where(eq(boxLinks.sourceBoxId, sourceNote.id));
		expect(links).toHaveLength(0);
	});
});
