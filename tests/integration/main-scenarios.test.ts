import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { timeline as timelineSchema, box as boxSchema, user as userSchema } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import * as authModule from '$lib/server/auth';
import type { RequestEvent, ServerLoadEvent } from '@sveltejs/kit';
import type { User, Session } from 'better-auth';
import { generateSlug } from '$lib/utils/slug';

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
	await db.insert(userSchema).values({
		id: testUser.id,
		name: testUser.name,
		email: testUser.email,
	});
});

afterAll(async () => {
	await db.delete(timelineSchema).where(eq(timelineSchema.userId, testUser.id));
	await db.delete(boxSchema).where(eq(boxSchema.userId, testUser.id));
	await db.delete(userSchema).where(eq(userSchema.id, testUser.id));
});

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

const createMockLoadEvent = (
	locals: RequestEvent['locals'],
	params: Record<string, string> = {}
): ServerLoadEvent => {
	const url = new URL(`http://localhost/home`);
	const request = new Request(url);

	return {
		request,
		locals,
		params,
		url,
		cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn(), serialize: vi.fn(), getAll: vi.fn() },
		fetch: vi.fn(),
		getClientAddress: () => '127.0.0.1',
		platform: undefined,
		route: { id: '/home' },
		setHeaders: vi.fn(),
		isDataRequest: true,
		isSubRequest: false,
		parent: async () => ({}),
		depends: vi.fn(),
		untrack: vi.fn()
	};
};

describe('Scenario 2: Note Management (CRUD)', () => {
	let createdNoteId = '';
	const noteData = {
		title: 'My First Note',
		content: 'This is a test of wiki links. Link to [[Test Page]].'
	};

	it('2.1: Creates a new box note', async () => {
		const { actions } = await import('../../src/routes/home/box/new/+page.server');
		const event = await createMockFormRequestEvent(
			{ user: mockSession.user, session: mockSession.session, auth: authModule.auth },
			{}, // No params needed for the new route
			noteData
		);

		await expect(actions.default(event)).rejects.toThrow();

		const newNotes = await db.select().from(boxSchema).where(eq(boxSchema.userId, testUser.id));
		const newNote = newNotes[0];
		expect(newNote).toBeDefined();
		expect(newNote?.title).toBe(noteData.title);
		createdNoteId = newNote?.id || '';
	});

	it('2.2: Verifies the new note appears in the box list', async () => {
		const { load } = await import('../../src/routes/home/box/+page.server');
		const event = createMockLoadEvent({
			user: mockSession.user,
			session: mockSession.session,
			auth: authModule.auth
		});

		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValue(mockSession);
		const pageData = await load(event);

		expect(pageData.notes).toBeDefined();
		const foundNote = pageData.notes.find((n) => n.id === createdNoteId);
		expect(foundNote).toBeDefined();
	});

	it('2.3: Updates an existing box note', async () => {
		const { actions } = await import('../../src/routes/home/box/[id]/+page.server');
		const updatedNoteData = {
			title: 'Updated Note',
			content: 'Content has been updated.'
		};
		const event = await createMockFormRequestEvent(
			{ user: mockSession.user, session: mockSession.session, auth: authModule.auth },
			{ id: createdNoteId },
			updatedNoteData
		);

		await expect(actions.default(event)).rejects.toThrow();

		const updatedNote = await db.query.box.findFirst({ where: eq(boxSchema.id, createdNoteId) });

		expect(updatedNote).toBeDefined();
		expect(updatedNote?.title).toBe(updatedNoteData.title);
	});

	it('2.4: Deletes the note', async () => {
		const { DELETE } = await import('../../src/routes/api/notes/[id]/+server');
		const event = {
			locals: { user: mockSession.user, session: mockSession.session, auth: authModule.auth },
			params: { id: createdNoteId },
			request: new Request(`http://localhost/api/notes/${createdNoteId}`, { method: 'DELETE' })
		} as unknown as RequestEvent;

		const response = await DELETE(event);
		expect(response.status).toBe(204);

		const deletedNote = await db.query.box.findFirst({ where: eq(boxSchema.id, createdNoteId) });
		expect(deletedNote).toBeUndefined();
	});

	it('2.5: Verifies the home page load function returns timeline posts', async () => {
		const { load } = await import('../../src/routes/home/+page.server');

		await db.insert(timelineSchema).values({
			id: ulid(),
			userId: testUser.id,
			content: 'a timeline post',
			status: 'active',
			createdAt: new Date(),
			updatedAt: new Date()
		});

		const event = createMockLoadEvent({
			user: mockSession.user,
			session: mockSession.session,
			auth: authModule.auth
		});
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValue(mockSession);

		const pageData = await load(event);

		expect(pageData.posts).toBeDefined();
		expect(pageData.posts.length).toBeGreaterThan(0);
	});
});