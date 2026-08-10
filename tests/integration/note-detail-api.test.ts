import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { notes, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { GET as getNote } from '../../src/routes/api/notes/[id]/+server';

// Mock the auth module: routes call createAuth() at module load time and use
// auth.api.getSession({ headers }) to authenticate.
const { mockAuth } = vi.hoisted(() => ({
	mockAuth: {
		api: {
			getSession: vi.fn()
		}
	}
}));

vi.mock('$lib/server/auth', () => ({
	createAuth: vi.fn(() => mockAuth)
}));

// モック用の認証セッション（ユーザーA = ノートの所有者）
const mockSession = {
	user: {
		id: 'testUserA',
		email: 'test@example.com',
		name: 'Test User',
		emailVerified: false,
		twoFactorEnabled: false,
		createdAt: new Date(),
		updatedAt: new Date()
	},
	session: {
		id: ulid(),
		userId: 'testUserA',
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
	params?: Record<string, string>
): Promise<RequestEvent> => {
	const request = new Request(url, {
		method,
		headers: { 'Content-Type': 'application/json' }
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
			auth: mockAuth.api
		},
		platform: { env: { DB: {} } }, // DB プロパティを追加
		route: {
			id: '/api/notes/[id]'
		},
		setHeaders: vi.fn(),
		isDataRequest: false,
		isSubRequest: false
	} as unknown as RequestEvent;
};

interface NoteDetailResponse {
	id: string;
	userId: string;
	title: string;
	content: string | null;
	createdAt: string;
	updatedAt: string;
	isPublic: boolean;
	slug: string;
	tags?: string[];
}

describe('GET /api/notes/{id}', () => {
	let testUserId: string;
	let testNoteId: string;
	let otherUserId: string;
	let otherUserNoteId: string;

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

		// 取得対象のノート（ユーザーA）
		testNoteId = ulid();
		await db.insert(notes).values({
			id: testNoteId,
			userId: testUserId,
			title: 'Detail Test Note',
			content: 'Detail test content',
			isPublic: false,
			status: 'inbox',
			createdAt: new Date(),
			updatedAt: new Date(),
			slug: 'detail-test-note'
		});

		// 別ユーザー（ユーザーB）とそのノート
		otherUserId = ulid();
		await db
			.insert(user)
			.values({
				id: otherUserId,
				email: 'other@example.com',
				name: 'Other User',
				emailVerified: false,
				twoFactorEnabled: false,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.onConflictDoNothing();

		otherUserNoteId = ulid();
		await db.insert(notes).values({
			id: otherUserNoteId,
			userId: otherUserId,
			title: 'Other Users Detail Note',
			content: 'Should not be visible',
			isPublic: false,
			status: 'inbox',
			createdAt: new Date(),
			updatedAt: new Date(),
			slug: 'other-users-detail-note'
		});
	});

	afterAll(async () => {
		await db.delete(notes).where(eq(notes.userId, testUserId));
		await db.delete(notes).where(eq(notes.userId, otherUserId));
		await db.delete(user).where(eq(user.id, testUserId));
		await db.delete(user).where(eq(user.id, otherUserId));
	});

	it('should return 401 if unauthorized', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(null);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${testNoteId}`,
			'GET',
			null,
			{ id: testNoteId }
		);
		const response = await getNote(params as Parameters<typeof getNote>[0]);
		expect(response.status).toBe(401);
	});

	it('should return 404 if the note does not exist', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const nonExistentId = ulid();
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${nonExistentId}`,
			'GET',
			mockSession,
			{ id: nonExistentId }
		);
		const response = await getNote(params as Parameters<typeof getNote>[0]);
		expect(response.status).toBe(404);
		const body: string = await response.text();
		expect(body).toBe('Note not found');
	});

	it('should return 404 if the note belongs to another user', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${otherUserNoteId}`,
			'GET',
			mockSession,
			{ id: otherUserNoteId }
		);
		const response = await getNote(params as Parameters<typeof getNote>[0]);
		expect(response.status).toBe(404);
		const body: string = await response.text();
		expect(body).toBe('Note not found');
	});

	it('should return the note with content when it belongs to the session user', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${testNoteId}`,
			'GET',
			mockSession,
			{ id: testNoteId }
		);
		const response = await getNote(params as Parameters<typeof getNote>[0]);
		expect(response.status).toBe(200);
		const body: NoteDetailResponse = await response.json();
		expect(body.id).toBe(testNoteId);
		expect(body.userId).toBe(testUserId);
		expect(body.title).toBe('Detail Test Note');
		expect(body.content).toBe('Detail test content');
		expect(body.slug).toBe('detail-test-note');
		expect(body.tags).toEqual([]);
	});
});
