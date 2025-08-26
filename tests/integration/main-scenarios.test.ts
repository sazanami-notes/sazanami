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
	let createdNoteId = '';
	const noteData = {
		title: 'My First Note',
		content: 'This is a test of wiki links. Link to [[Test Page]].'
	};

	it('2.1: Creates a new note', async () => {
		const { actions } = await import('../../src/routes/home/note/new/+page.server');
		const event = await createMockFormRequestEvent(
			{ user: mockSession.user, session: mockSession.session },
			{}, // No params needed for the new route
			noteData
		);

		await expect(actions.default(event)).rejects.toThrow();

		const newNotes = await db.select().from(notesSchema).where(eq(notesSchema.userId, testUser.id));
		const newNote = newNotes[0];
		expect(newNote).toBeDefined();
		expect(newNote?.title).toBe(noteData.title);
		expect(newNote?.content).toBe(noteData.content);
		createdNoteId = newNote?.id || '';
		expect(createdNoteId).not.toBe('');
	});

	it('2.2: Verifies the new note appears in the list', async () => {
		const { load } = await import('../../src/routes/home/box/+page.server');
		const event = await createMockFormRequestEvent(
			{ user: mockSession.user, session: mockSession.session },
			{}, // No params needed
			{}
		);

		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValue(mockSession);
		const pageData = await load(event);

		expect(pageData.notes).toBeDefined();
		expect(pageData.notes.length).toBeGreaterThan(0);
		const foundNote = pageData.notes.find((n) => n.id === createdNoteId);
		expect(foundNote).toBeDefined();
		expect(foundNote?.title).toBe(noteData.title);
	});

	it('2.3: Updates an existing note', async () => {
		const { actions } = await import('../../src/routes/home/note/[id]/+page.server');
		const updatedNoteData = {
			title: 'Updated Note',
			content: 'Content has been updated.'
		};
		const event = await createMockFormRequestEvent(
			{ user: mockSession.user, session: mockSession.session },
			{ id: createdNoteId },
			updatedNoteData
		);

		await expect(actions.default(event)).rejects.toThrow();

		const updatedNotes = await db.select().from(notesSchema).where(eq(notesSchema.id, createdNoteId));
		const updatedNote = updatedNotes[0];

		expect(updatedNote).toBeDefined();
		expect(updatedNote?.title).toBe(updatedNoteData.title);
		expect(updatedNote?.content).toBe(updatedNoteData.content);
	});

	it('2.4: Deletes the note', async () => {
		const { DELETE } = await import('../../src/routes/api/notes/[id]/+server');
		const event = {
			locals: { user: mockSession.user, session: mockSession.session },
			params: { id: createdNoteId },
			request: new Request(`http://localhost/api/notes/${createdNoteId}`, { method: 'DELETE' })
		} as unknown as RequestEvent;

		const response = await DELETE(event);
		expect(response.status).toBe(204);

		const deletedNotes = await db.select().from(notesSchema).where(eq(notesSchema.id, createdNoteId));
		expect(deletedNotes.length).toBe(0);

		// Verify the note is gone from the list
		const { load } = await import('../../src/routes/home/box/+page.server');
		const listEvent = await createMockFormRequestEvent(
			{ user: mockSession.user, session: mockSession.session },
			{},
			{}
		);
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValue(mockSession);
		const pageData = await load(listEvent);
		const foundNote = pageData.notes.find((n) => n.id === createdNoteId);
		expect(foundNote).toBeUndefined();
	});

	it('2.5: Loads a note with a Japanese title successfully', async () => {
		const japaneseNoteData = {
			title: '日本語のノート',
			content: 'これはテストです。'
		};

		// 1. Create the note
		const createAction = await import('../../src/routes/home/note/new/+page.server');
		const createEvent = await createMockFormRequestEvent(
			{ user: mockSession.user, session: mockSession.session },
			{},
			japaneseNoteData
		);
		await expect(createAction.actions.default(createEvent)).rejects.toThrow();

		// Get the created note's ID
		const newNote = (await db.select().from(notesSchema).where(and(eq(notesSchema.userId, testUser.id), eq(notesSchema.title, japaneseNoteData.title))))[0];
		expect(newNote).toBeDefined();

		// 2. Load the page for the new note
		const { load } = await import('../../src/routes/home/note/[id]/+page.server');
		const loadEvent = {
			locals: { user: mockSession.user, session: mockSession.session },
			params: { id: newNote.id },
			fetch: vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ oneHopLinks: [], backlinks: [], twoHopLinks: [] }), {
					status: 200
				})
			)
		} as unknown as RequestEvent;

		const pageData = await load(loadEvent);

		// 3. Assert correct data was loaded
		expect(pageData.note).toBeDefined();
		expect(pageData.note.title).toBe(japaneseNoteData.title);
		expect(pageData.note.content).toBe(japaneseNoteData.content);

		await db.delete(notesSchema).where(eq(notesSchema.id, pageData.note.id));
	});
});

describe('Scenario 3: Search and Wiki Link API', () => {
	// ... (This part of the test doesn't seem to be affected by the routing changes)
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
		}
	});

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
