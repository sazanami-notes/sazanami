import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { notes as notesSchema, user as userSchema, noteLinks } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { createNote, updateNote, updateNoteLinks } from '$lib/server/db'; // Using db functions directly
import { generateSlug } from '$lib/utils/slug';

// Test User
const testUser = {
	id: ulid(),
	name: 'notelinkdbuser',
	email: 'notelinkdb@example.com'
};

let noteIds: Record<string, string> = {};

beforeAll(async () => {
	// Create user
	await db.insert(userSchema).values({
		id: testUser.id,
		name: testUser.name,
		email: testUser.email,
		emailVerified: true
	});

	// Pre-create target notes
	const noteA = await createNote({
		userId: testUser.id,
		title: 'Target A',
		content: '...',
		isPublic: false,
		isPinned: false,
		status: 'inbox',
		tags: []
	});
	const noteB = await createNote({
		userId: testUser.id,
		title: 'Target B',
		content: '...',
		isPublic: false,
		isPinned: false,
		status: 'inbox',
		tags: []
	});
	noteIds['Target A'] = noteA.id;
	noteIds['Target B'] = noteB.id;
});

afterAll(async () => {
	await db.delete(noteLinks);
	await db.delete(notesSchema).where(eq(notesSchema.userId, testUser.id));
	await db.delete(userSchema).where(eq(userSchema.id, testUser.id));
});

describe('note_links table update logic', () => {
	it('should create a link when a new note with a wiki link is created', async () => {
		const sourceNote = await createNote({
			userId: testUser.id,
			title: 'Source Note 1',
			content: 'This links to [[Target A]].',
			isPublic: false,
			isPinned: false,
			status: 'inbox',
			tags: []
		});
		await updateNoteLinks(sourceNote.id, sourceNote.content || '', testUser.id);

		const links = await db
			.select()
			.from(noteLinks)
			.where(eq(noteLinks.sourceNoteId, sourceNote.id));

		expect(links).toHaveLength(1);
		expect(links[0].targetNoteId).toBe(noteIds['Target A']);
	});

	it('should update links when a note content is changed', async () => {
		// First, create a note with a link to A
		const sourceNote = await createNote({
			userId: testUser.id,
			title: 'Source Note 2',
			content: 'Initial link to [[Target A]].',
			isPublic: false,
			isPinned: false,
			status: 'inbox',
			tags: []
		});
		await updateNoteLinks(sourceNote.id, sourceNote.content || '', testUser.id);

		// Now, update the note to link to B instead
		const newContent = 'Now it links to [[Target B]].';
		await updateNote(sourceNote.id, testUser.id, { content: newContent });
		await updateNoteLinks(sourceNote.id, newContent, testUser.id);

		const links = await db
			.select()
			.from(noteLinks)
			.where(eq(noteLinks.sourceNoteId, sourceNote.id));

		expect(links).toHaveLength(1);
		expect(links[0].targetNoteId).toBe(noteIds['Target B']);
	});

	it('should remove all links if the updated note has no links', async () => {
		// First, create a note with a link
		const sourceNote = await createNote({
			userId: testUser.id,
			title: 'Source Note 3',
			content: 'This will have its link removed. [[Target A]]',
			isPublic: false,
			isPinned: false,
			status: 'inbox',
			tags: []
		});
		await updateNoteLinks(sourceNote.id, sourceNote.content || '', testUser.id);

		// Verify the link exists
		let links = await db.select().from(noteLinks).where(eq(noteLinks.sourceNoteId, sourceNote.id));
		expect(links).toHaveLength(1);

		// Now, update the note to have no links
		const newContent = 'The link is gone.';
		await updateNote(sourceNote.id, testUser.id, { content: newContent });
		await updateNoteLinks(sourceNote.id, newContent, testUser.id);

		links = await db.select().from(noteLinks).where(eq(noteLinks.sourceNoteId, sourceNote.id));
		expect(links).toHaveLength(0);
	});
});
