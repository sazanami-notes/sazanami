import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { notes, user as userSchema } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as authModule from '$lib/server/auth';
import { generateSlug } from '$lib/utils/slug';
import type { RequestEvent } from '@sveltejs/kit';
import { POST as createNote } from '../../src/routes/api/notes/+server';
import { PUT as updateNote } from '../../src/routes/api/notes/[id]/+server';
import type { User, Session } from 'better-auth';

// モック用の認証セッション
const mockSession = {
	user: {
		id: 'testUser1',
		email: 'test@example.com',
		name: 'Test User',
		emailVerified: false,
		createdAt: new Date(),
		updatedAt: new Date()
	} as User,
	session: {
		id: 'session1',
		userId: 'testUser1',
		expiresAt: new Date(Date.now() + 3600000),
		createdAt: new Date(),
		updatedAt: new Date(),
		token: 'token1'
	} as Session
};

// RequestEventのモック
const createMockEvent = (request: Request, params?: any, session: any = mockSession) => {
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

beforeAll(async () => {
	// テスト用ユーザーの作成
	await db
		.insert(userSchema)
		.values({
			id: mockSession.user.id,
			name: mockSession.user.name,
			email: mockSession.user.email,
			emailVerified: mockSession.user.emailVerified,
			createdAt: mockSession.user.createdAt,
			updatedAt: mockSession.user.updatedAt
		})
		.onConflictDoNothing();
});

afterAll(async () => {
	await db.delete(notes).where(eq(notes.userId, mockSession.user.id));
	await db.delete(userSchema).where(eq(userSchema.id, mockSession.user.id));
});

describe('POST /api/notes', () => {
	it('should return 401 if not authenticated', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(null);

		const request = new Request('http://localhost/api/notes', {
			method: 'POST',
			body: JSON.stringify({ title: 'Test Note', content: 'Test Content' })
		});

		const event = createMockEvent(request, {}, null);
		const response = await createNote(event);

		expect(response.status).toBe(401);
	});

	it('should return 400 if title or content is missing', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession);

		const request = new Request('http://localhost/api/notes', {
			method: 'POST',
			body: JSON.stringify({ title: '' }) // Content missing
		});

		const event = createMockEvent(request);
		const response = await createNote(event);

		expect(response.status).toBe(400);
	});

	it('should return 400 if invalid JSON format', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession);

		const request = new Request('http://localhost/api/notes', {
			method: 'POST',
			body: 'invalid json'
		});

		const event = createMockEvent(request);
		const response = await createNote(event);

		expect(response.status).toBe(400);
	});

	it('should create a note and save the correct slug', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession);

		const noteData = {
			title: 'My First Note',
			content: 'This is a test note.'
		};

		const request = new Request('http://localhost/api/notes', {
			method: 'POST',
			body: JSON.stringify(noteData)
		});

		const event = createMockEvent(request);
		const response = await createNote(event);

		expect(response.status).toBe(201);
		const savedNoteData = await response.json();
		expect(savedNoteData).toBeDefined();
		expect(savedNoteData.id).toBeDefined();

		const savedNote = await db.query.notes.findFirst({
			where: eq(notes.id, savedNoteData.id)
		});

		expect(savedNote).toBeDefined();
		expect(savedNote?.title).toBe(noteData.title);
		expect(savedNote?.slug).toBe(generateSlug(noteData.title));
	});

	it('should create a note with japanese title and save the correct slug', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession);

		const noteData = {
			title: '日本語のタイトル',
			content: '日本語のコンテンツです。'
		};

		const request = new Request('http://localhost/api/notes', {
			method: 'POST',
			body: JSON.stringify(noteData)
		});

		const event = createMockEvent(request);
		const response = await createNote(event);

		expect(response.status).toBe(201);
		const savedNoteData = await response.json();

		const savedNote = await db.query.notes.findFirst({
			where: eq(notes.id, savedNoteData.id)
		});

		expect(savedNote?.title).toBe(noteData.title);
		expect(savedNote?.slug).toBe(generateSlug(noteData.title));
	});
});

describe('PUT /api/notes/[id]', () => {
	let testNoteId: string;

	beforeAll(async () => {
		testNoteId = ulid();
		await db.insert(notes).values({
			id: testNoteId,
			userId: mockSession.user.id,
			title: 'Original Title',
			slug: generateSlug('Original Title'),
			content: 'Original Content',
			createdAt: new Date(),
			updatedAt: new Date()
		});
	});

	it('should update a note and the slug if the title changed', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession);

		const updatedData = {
			title: 'Updated Title',
			content: 'Updated Content'
		};

		const request = new Request(`http://localhost/api/notes/${testNoteId}`, {
			method: 'PUT',
			body: JSON.stringify(updatedData)
		});

		const event = createMockEvent(request, { id: testNoteId });
		const response = await updateNote(event);

		expect(response.status).toBe(200);

		const updatedNote = await db.query.notes.findFirst({
			where: eq(notes.id, testNoteId)
		});

		expect(updatedNote?.title).toBe(updatedData.title);
		expect(updatedNote?.slug).toBe(generateSlug(updatedData.title));
	});

	it('should update a note with japanese title and re-generate the correct slug', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession);
		const updatedTitle = '日本語の更新されたノート';

		const request = new Request(`http://localhost/api/notes/${testNoteId}`, {
			method: 'PUT',
			body: JSON.stringify({ title: updatedTitle, content: '内容' })
		});

		const event = createMockEvent(request, { id: testNoteId });
		const response = await updateNote(event);

		expect(response.status).toBe(200);

		const updatedNote = await db.query.notes.findFirst({
			where: eq(notes.id, testNoteId)
		});

		expect(updatedNote?.title).toBe(updatedTitle);
		expect(updatedNote?.slug).toBe(generateSlug(updatedTitle));
	});
});
