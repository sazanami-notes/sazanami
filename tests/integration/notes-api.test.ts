import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { notes, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as authModule from '$lib/server/auth';
import { generateSlug } from '$lib/utils/slug';
import type { RequestHandler, RequestEvent } from '@sveltejs/kit';
import { POST as createNote, GET as getNotes } from '../../src/routes/api/notes/+server';
import { PUT as updateNote } from '../../src/routes/api/notes/[id]/+server';
import type { User, Session } from 'better-auth';

// モック用の認証セッション
const mockSession = {
	user: {
		id: 'testUser1',
		email: 'test@example.com',
		name: 'Test User',
		emailVerified: false,
		twoFactorEnabled: false,
		createdAt: new Date(),
		updatedAt: new Date()
	},
	session: {
		id: ulid(),
		userId: 'testUser1',
		expiresAt: new Date(Date.now() + 1000 * 60 * 60),
		createdAt: new Date(),
		updatedAt: new Date(),
		token: 'dummy-token'
	}
};

// RequestHandler のモックを作成するヘルパー関数
const createMockRequestHandlerParams = async (
	url: string,
	method: string,
	session: typeof mockSession | null,
	body?: any,
	params?: Record<string, string>
): Promise<RequestEvent> => {
	const request = new Request(url, {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined
	});

	return {
		request: request,
		url: new URL(request.url),
		params: params || {},
		cookies: {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
			serialize: vi.fn(),
			getAll: vi.fn()
		},
		fetch: vi.fn(),
		getClientAddress: vi.fn(() => '127.0.0.1'),
		locals: {
			user: session ? session.user : null,
			session: session ? session.session : null,
			auth: authModule.auth.api
		},
		platform: { env: { DB: {} as any } }, // DB プロパティを追加
		route: {
			id: '/api/notes'
		},
		setHeaders: vi.fn(),
		isDataRequest: false,
		isSubRequest: false
	} as unknown as RequestEvent;
};

interface NoteResponse {
	id: string;
	userId: string;
	title: string;
	content: string;
	createdAt: string;
	updatedAt: string;
	isPublic: boolean;
	slug: string;
	tags?: string[];
}

describe('POST /api/notes', () => {
	let testUserId: string;

	beforeAll(async () => {
		testUserId = ulid();
		mockSession.user.id = testUserId;
		mockSession.session.userId = testUserId;

		await db
			.insert(user)
			.values({
				id: testUserId,
				email: 'test@example.com',
				name: 'Test User',
				emailVerified: false,
				twoFactorEnabled: false,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.onConflictDoNothing();
	});

	afterAll(async () => {
		await db.delete(notes).where(eq(notes.userId, testUserId));
		await db.delete(user).where(eq(user.id, testUserId));
	});

	it('should return 401 if unauthorized', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(null);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes',
			'POST',
			null,
			{ title: 'Test', content: 'Test' }
		);
		const response = await createNote(params);
		expect(response.status).toBe(401);
	});

	it('should return 400 if invalid JSON format', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession as any);
		const request = new Request('http://localhost/api/notes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: 'invalid json'
		});
		// RequestEventのモックを適切に作成
		const params = {
			request,
			url: new URL(request.url),
			params: {},
			cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn(), serialize: vi.fn(), getAll: vi.fn() },
			fetch: vi.fn(),
			getClientAddress: vi.fn(() => '127.0.0.1'),
			locals: {
				user: mockSession.user,
				session: mockSession.session,
				auth: authModule.auth.api
			},
			platform: { env: { DB: {} as any } }, // DB プロパティを追加
			route: { id: '/api/notes' },
			setHeaders: vi.fn(),
			isDataRequest: false,
			isSubRequest: false
		} as unknown as RequestEvent;
		const response = await createNote(params);
		expect(response.status).toBe(400);
		const body: { message: string } = await response.json();
		expect(body.message).toBe('Invalid JSON format');
	});

	it('should create a note and save the correct slug', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession as any);
		const noteTitle = 'My New Test Note';
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes',
			'POST',
			mockSession,
			{ title: noteTitle, content: 'Some content' }
		);
		const response = await createNote(params);
		expect(response.status).toBe(201);
		const newNote: NoteResponse = await response.json();
		expect(newNote.title).toBe(noteTitle);
		expect(newNote.slug).toBe(generateSlug(noteTitle));

		// データベースから取得して確認
		const fetchedNote = await db
			.select()
			.from(notes)
			.where(eq(notes.id, newNote.id))
			.limit(1)
			.get();
		expect(fetchedNote?.slug).toBe(generateSlug(noteTitle));
	});

	it('should create a note with japanese title and save the correct slug', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession as any);
		const noteTitle = '日本語の新しいノート';
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes',
			'POST',
			mockSession,
			{ title: noteTitle, content: 'Some content in Japanese' }
		);
		const response = await createNote(params);
		expect(response.status).toBe(201);
		const newNote: NoteResponse = await response.json();
		expect(newNote.title).toBe(noteTitle);
		expect(newNote.slug).toBe(generateSlug(noteTitle));

		const fetchedNote = await db
			.select()
			.from(notes)
			.where(eq(notes.id, newNote.id))
			.limit(1)
			.get();
		expect(fetchedNote?.slug).toBe(generateSlug(noteTitle));
	});
});

describe('PUT /api/notes/{id}', () => {
	let testUserId: string;
	let existingNoteId: string;
	let existingNoteSlug: string;

	beforeAll(async () => {
		testUserId = ulid();
		mockSession.user.id = testUserId;
		mockSession.session.userId = testUserId;

		await db
			.insert(user)
			.values({
				id: testUserId,
				email: 'test@example.com',
				name: 'Test User',
				emailVerified: false,
				twoFactorEnabled: false,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.onConflictDoNothing();

		const initialTitle = 'Note to Update';
		existingNoteId = ulid();
		existingNoteSlug = generateSlug(initialTitle);
		await db.insert(notes).values({
			id: existingNoteId,
			userId: testUserId,
			title: initialTitle,
			content: 'Original content',
			isPublic: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			slug: existingNoteSlug
		});
	});

	afterAll(async () => {
		await db.delete(notes).where(eq(notes.userId, testUserId));
		await db.delete(user).where(eq(user.id, testUserId));
	});

	it('should return 401 if unauthorized', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(null);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${existingNoteId}`,
			'PUT',
			null,
			{ title: 'Updated Title' },
			{ id: existingNoteId }
		);
		const response = await updateNote(params);
		expect(response.status).toBe(401);
	});

	it('should return 400 if note ID is missing in params', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession as any);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/',
			'PUT',
			mockSession,
			{ title: 'Updated Title' }
		);
		const response = await updateNote(params);
		expect(response.status).toBe(400);
		const body: string = await response.text();
		expect(body).toBe('Note ID is required');
	});

	it('should return 404 if note not found', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession as any);
		const nonExistentId = ulid();
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${nonExistentId}`,
			'PUT',
			mockSession,
			{ title: 'Updated Title' },
			{ id: nonExistentId }
		);
		const response = await updateNote(params);
		expect(response.status).toBe(404);
		const body: string = await response.text();
		expect(body).toBe('Note not found');
	});

	it('should update a note and re-generate the correct slug', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession as any);
		const updatedTitle = 'My Updated Test Note';
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${existingNoteId}`,
			'PUT',
			mockSession,
			{ title: updatedTitle, content: 'Updated content' },
			{ id: existingNoteId }
		);
		const response = await updateNote(params);
		expect(response.status).toBe(200);
		const updatedNote: NoteResponse = await response.json();
		expect(updatedNote.title).toBe(updatedTitle);
		expect(updatedNote.slug).toBe(generateSlug(updatedTitle));

		// データベースから取得して確認
		const fetchedNote = await db
			.select()
			.from(notes)
			.where(eq(notes.id, existingNoteId))
			.limit(1)
			.get();
		expect(fetchedNote?.slug).toBe(generateSlug(updatedTitle));
	});

	it('should update a note with japanese title and re-generate the correct slug', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession as any);
		const updatedTitle = '日本語の更新されたノート';
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${existingNoteId}`,
			'PUT',
			mockSession,
			{ title: updatedTitle, content: 'Updated content in Japanese' },
			{ id: existingNoteId }
		);
		const response = await updateNote(params);
		expect(response.status).toBe(200);
		const updatedNote: NoteResponse = await response.json();
		expect(updatedNote.title).toBe(updatedTitle);
		expect(updatedNote.slug).toBe(generateSlug(updatedTitle));

		const fetchedNote = await db
			.select()
			.from(notes)
			.where(eq(notes.id, existingNoteId))
			.limit(1)
			.get();
		expect(fetchedNote?.slug).toBe(generateSlug(updatedTitle));
	});
});
