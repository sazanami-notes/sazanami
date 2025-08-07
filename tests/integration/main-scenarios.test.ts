import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { notes as notesSchema, user as userSchema } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import * as authModule from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import type { User, Session } from 'better-auth';
import { generateSlug } from '$lib/utils/slug';

// Mock user and session
const testUser = {
	id: ulid(),
	name: 'testuser',
	email: 'test@example.com'
};

const mockSession = {
	user: {
		id: testUser.id,
		email: testUser.email,
		name: testUser.name,
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date()
	} as User,
	session: {
		id: ulid(),
		userId: testUser.id,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60),
		createdAt: new Date(),
		updatedAt: new Date(),
		token: 'dummy-token'
	} as Session
};

beforeAll(async () => {
	// Create the test user in the database
	await db.insert(userSchema).values({
		id: testUser.id,
		name: testUser.name,
		email: testUser.email,
		emailVerified: true
	});
});

afterAll(async () => {
	// Clean up notes and user
	await db.delete(notesSchema).where(eq(notesSchema.userId, testUser.id));
	await db.delete(userSchema).where(eq(userSchema.id, testUser.id));
});

// Helper to create mock RequestEvent for form data
const createMockFormRequestEvent = async (
	locals: RequestEvent['locals'],
	params: Record<string, string> = {},
	formData: Record<string, string>
): Promise<RequestEvent> => {
	const data = new FormData();
	for (const key in formData) {
		data.append(key, formData[key]);
	}
	const request = new Request('http://localhost/test', {
		method: 'POST',
		body: data
	});

	return {
		request,
		locals,
		params,
		url: new URL(request.url),
		cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn(), serialize: vi.fn(), getAll: vi.fn() },
		fetch: vi.fn(),
		getClientAddress: () => '127.0.0.1',
		platform: { env: { DB: {} as any } },
		route: { id: null },
		setHeaders: vi.fn(),
		isDataRequest: false,
		isSubRequest: false
	} as RequestEvent;
};

describe('Scenario 2: Note Management (CRUD)', () => {
	// Tests for create, read, update, delete will go here
	let createdNoteSlug = '';
	const noteData = {
		title: 'My First Note',
		content: 'This is a test of wiki links. Link to [[Test Page]].'
	};

	it('2.1: Creates a new note', async () => {
		// Import the action from the server file
		const { actions } = await import('../../src/routes/[username]/new/+page.server');

		const event = await createMockFormRequestEvent(
			{ user: mockSession.user, session: mockSession.session },
			{ username: testUser.name },
			noteData
		);

		// The action should throw a redirect on success
		await expect(actions.default(event)).rejects.toThrow();

		// Verify the note is in the database
		const newNotes = await db
			.select()
			.from(notesSchema)
			.where(eq(notesSchema.userId, testUser.id));

		const newNote = newNotes[0];
		expect(newNote).toBeDefined();
		expect(newNote?.title).toBe(noteData.title);
		expect(newNote?.content).toBe(noteData.content);
		createdNoteSlug = newNote?.slug || '';
		expect(createdNoteSlug).not.toBe('');
	});

	it('2.2: Verifies the new note appears in the list', async () => {
		const { load } = await import('../../src/routes/[username]/+page.server');
		const event = await createMockFormRequestEvent(
			{ user: mockSession.user, session: mockSession.session },
			{ username: testUser.name },
			{}
		);

		// The load function in [username]/+page.server.ts doesn't seem to use locals,
		// so we need to mock getSession to make it think we are logged in.
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValue(mockSession);

		const pageData = await load(event);

		expect(pageData.notes).toBeDefined();
		expect(pageData.notes.length).toBeGreaterThan(0);
		const foundNote = pageData.notes.find((n) => n.slug === createdNoteSlug);
		expect(foundNote).toBeDefined();
		expect(foundNote?.title).toBe(noteData.title);
	});

	it('2.3: Updates an existing note', async () => {
		const { actions } = await import(
			'../../src/routes/[username]/[notetitle]/edit/+page.server'
		);
		const updatedNoteData = {
			title: 'Updated Note',
			content: 'Content has been updated.'
		};
		console.log('Updating note with slug:', createdNoteSlug);
		const event = await createMockFormRequestEvent(
			{ user: mockSession.user, session: mockSession.session },
			{ username: testUser.name, notetitle: createdNoteSlug },
			updatedNoteData
		);

		await expect(actions.default(event)).rejects.toThrow();

		const updatedNotes = await db
			.select()
			.from(notesSchema)
			.where(eq(notesSchema.userId, testUser.id));
		const updatedNote = updatedNotes[0];

		expect(updatedNote).toBeDefined();
		expect(updatedNote?.title).toBe(updatedNoteData.title);
		expect(updatedNote?.content).toBe(updatedNoteData.content);
		// Update slug for the next test
		createdNoteSlug = updatedNote?.slug || '';
	});

	it('2.4: Deletes the note', async () => {
		const { DELETE } = await import('../../src/routes/api/notes/[id]/+server');

		// Get the note ID from the database using the slug
		const notes = await db
			.select()
			.from(notesSchema)
			.where(and(eq(notesSchema.userId, testUser.id), eq(notesSchema.slug, createdNoteSlug)));
		const noteToDelete = notes[0];
		expect(noteToDelete).toBeDefined();
		const noteId = noteToDelete!.id;

		const event = {
			locals: { user: mockSession.user, session: mockSession.session },
			params: { id: noteId },
			request: new Request(`http://localhost/api/notes/${noteId}`, { method: 'DELETE' })
		} as unknown as RequestEvent;

		const response = await DELETE(event);
		expect(response.status).toBe(204);

		// Verify the note is deleted from the database
		const deletedNotes = await db.select().from(notesSchema).where(eq(notesSchema.id, noteId));
		expect(deletedNotes.length).toBe(0);

		// Verify the note is gone from the list
		const { load } = await import('../../src/routes/[username]/+page.server');
		const listEvent = await createMockFormRequestEvent(
			{ user: mockSession.user, session: mockSession.session },
			{ username: testUser.name },
			{}
		);
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValue(mockSession);

		const pageData = await load(listEvent);
		const foundNote = pageData.notes.find((n) => n.slug === createdNoteSlug);
		expect(foundNote).toBeUndefined();
	});
});

describe('Scenario 3: Search and Wiki Link API', () => {
	const notesToCreate = [
		{
			title: 'About SvelteKit',
			content: 'A web framework',
			tags: ['Svelte']
		},
		{
			title: 'Intro to Tailwind CSS',
			content: 'A CSS framework',
			tags: ['CSS']
		},
		{ title: 'Test Page', content: 'This is the link target', tags: ['Test'] }
	];

	beforeAll(async () => {
		// Create notes for testing search and filtering
		for (const note of notesToCreate) {
			const noteId = ulid();
			await db.insert(notesSchema).values({
				id: noteId,
				userId: testUser.id,
				title: note.title,
				content: note.content,
				slug: generateSlug(note.title),
				createdAt: new Date(),
				updatedAt: new Date(),
				isPublic: false
			});
			// For simplicity, this test doesn't handle tag creation in the db.
			// The search functionality is on title/content and doesn't depend on tags table.
			// The resolve-link API also does not depend on tags.
		}
	});

	// Tests for search and API will go here
	it('3.1: Resolves an existing wiki link', async () => {
		const { GET } = await import('../../src/routes/api/notes/resolve-link/+server');
		const url = new URL('http://localhost');
		url.searchParams.set('title', 'Test Page');

		const event = {
			locals: { user: mockSession.user, session: mockSession.session },
			url: url,
			request: new Request(url)
		} as unknown as RequestEvent;
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValue(mockSession);

		const response = await GET(event);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.username).toBe(testUser.name);
		expect(body.title).toBe('Test Page');
	});

	it('3.2: Fails to resolve a non-existent wiki link', async () => {
		const { GET } = await import('../../src/routes/api/notes/resolve-link/+server');
		const url = new URL('http://localhost');
		url.searchParams.set('title', 'Non Existent Note');

		const event = {
			locals: { user: mockSession.user, session: mockSession.session },
			url: url,
			request: new Request(url)
		} as unknown as RequestEvent;
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValue(mockSession);

		const response = await GET(event);
		expect(response.status).toBe(404);
	});
});
