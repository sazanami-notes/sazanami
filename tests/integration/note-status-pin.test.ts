import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { notes, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { POST as changeNoteStatus } from '../../src/routes/api/notes/[id]/status/+server';
import { POST as toggleNotePin } from '../../src/routes/api/notes/[id]/pin/+server';

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
	body?: unknown,
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
			auth: mockAuth.api
		},
		platform: { env: { DB: {} } }, // DB プロパティを追加
		route: {
			id: '/api/notes/[id]/status'
		},
		setHeaders: vi.fn(),
		isDataRequest: false,
		isSubRequest: false
	} as unknown as RequestEvent;
};

describe('POST /api/notes/{id}/status', () => {
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

		// ステータス変更対象のノート（初期状態: inbox）
		testNoteId = ulid();
		await db.insert(notes).values({
			id: testNoteId,
			userId: testUserId,
			title: 'Status Test Note',
			content: 'Status test content',
			isPublic: false,
			status: 'inbox',
			createdAt: new Date(),
			updatedAt: new Date(),
			slug: 'status-test-note'
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
			title: 'Other Users Note',
			content: 'Should not be modified',
			isPublic: false,
			status: 'inbox',
			createdAt: new Date(),
			updatedAt: new Date(),
			slug: 'other-users-note'
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
			`http://localhost/api/notes/${testNoteId}/status`,
			'POST',
			null,
			{ status: 'box' },
			{ id: testNoteId }
		);
		const response = await changeNoteStatus(params);
		expect(response.status).toBe(401);
	});

	it('should return 404 if the note does not exist', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const nonExistentId = ulid();
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${nonExistentId}/status`,
			'POST',
			mockSession,
			{ status: 'box' },
			{ id: nonExistentId }
		);
		const response = await changeNoteStatus(params);
		expect(response.status).toBe(404);
	});

	it('should return 400 if the status is invalid', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${testNoteId}/status`,
			'POST',
			mockSession,
			{ status: 'invalid-status' },
			{ id: testNoteId }
		);
		const response = await changeNoteStatus(params);
		expect(response.status).toBe(400);
		const body: { message: string } = await response.json();
		expect(body.message).toBe('Invalid status provided');

		// DBの値が変わっていないことを確認
		const fetchedNote = await db
			.select({ status: notes.status })
			.from(notes)
			.where(eq(notes.id, testNoteId))
			.limit(1)
			.get();
		expect(fetchedNote?.status).toBe('inbox');
	});

	it('should return 404 and not modify the note when it belongs to another user', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${otherUserNoteId}/status`,
			'POST',
			mockSession,
			{ status: 'box' },
			{ id: otherUserNoteId }
		);
		const response = await changeNoteStatus(params);
		expect(response.status).toBe(404);

		// 別ユーザーのノートは変更されていないことを確認
		const fetchedNote = await db
			.select({ status: notes.status })
			.from(notes)
			.where(eq(notes.id, otherUserNoteId))
			.limit(1)
			.get();
		expect(fetchedNote?.status).toBe('inbox');
	});

	it('should move the note to box and persist the change in the database', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${testNoteId}/status`,
			'POST',
			mockSession,
			{ status: 'box' },
			{ id: testNoteId }
		);
		const response = await changeNoteStatus(params);
		expect(response.status).toBe(200);
		const body: { success: boolean; message: string } = await response.json();
		expect(body.success).toBe(true);
		expect(body.message).toBe('Note moved to box');

		const fetchedNote = await db
			.select({ status: notes.status })
			.from(notes)
			.where(eq(notes.id, testNoteId))
			.limit(1)
			.get();
		expect(fetchedNote?.status).toBe('box');
	});

	it('should move the note to archived and persist the change in the database', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${testNoteId}/status`,
			'POST',
			mockSession,
			{ status: 'archived' },
			{ id: testNoteId }
		);
		const response = await changeNoteStatus(params);
		expect(response.status).toBe(200);
		const body: { success: boolean; message: string } = await response.json();
		expect(body.success).toBe(true);
		expect(body.message).toBe('Note moved to archived');

		const fetchedNote = await db
			.select({ status: notes.status })
			.from(notes)
			.where(eq(notes.id, testNoteId))
			.limit(1)
			.get();
		expect(fetchedNote?.status).toBe('archived');
	});

	it('should move the note to trash and persist the change in the database', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${testNoteId}/status`,
			'POST',
			mockSession,
			{ status: 'trash' },
			{ id: testNoteId }
		);
		const response = await changeNoteStatus(params);
		expect(response.status).toBe(200);
		const body: { success: boolean; message: string } = await response.json();
		expect(body.success).toBe(true);
		expect(body.message).toBe('Note moved to trash');

		const fetchedNote = await db
			.select({ status: notes.status })
			.from(notes)
			.where(eq(notes.id, testNoteId))
			.limit(1)
			.get();
		expect(fetchedNote?.status).toBe('trash');
	});

	it('should move the note back to inbox and persist the change in the database', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${testNoteId}/status`,
			'POST',
			mockSession,
			{ status: 'inbox' },
			{ id: testNoteId }
		);
		const response = await changeNoteStatus(params);
		expect(response.status).toBe(200);
		const body: { success: boolean; message: string } = await response.json();
		expect(body.success).toBe(true);
		expect(body.message).toBe('Note moved to inbox');

		const fetchedNote = await db
			.select({ status: notes.status })
			.from(notes)
			.where(eq(notes.id, testNoteId))
			.limit(1)
			.get();
		expect(fetchedNote?.status).toBe('inbox');
	});

	it('should report success without an error when the note already has the requested status', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${testNoteId}/status`,
			'POST',
			mockSession,
			{ status: 'inbox' },
			{ id: testNoteId }
		);
		const response = await changeNoteStatus(params);
		expect(response.status).toBe(200);
		const body: { success: boolean; message: string } = await response.json();
		expect(body.success).toBe(true);
		expect(body.message).toBe('Note is already in inbox');

		const fetchedNote = await db
			.select({ status: notes.status })
			.from(notes)
			.where(eq(notes.id, testNoteId))
			.limit(1)
			.get();
		expect(fetchedNote?.status).toBe('inbox');
	});
});

describe('POST /api/notes/{id}/pin', () => {
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

		// ピン留め対象のノート（初期状態: 未ピン留め）
		testNoteId = ulid();
		await db.insert(notes).values({
			id: testNoteId,
			userId: testUserId,
			title: 'Pin Test Note',
			content: 'Pin test content',
			isPublic: false,
			isPinned: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			slug: 'pin-test-note'
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
			title: 'Other Users Pin Note',
			content: 'Should not be pinned',
			isPublic: false,
			isPinned: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			slug: 'other-users-pin-note'
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
			`http://localhost/api/notes/${testNoteId}/pin`,
			'POST',
			null,
			{ pinned: true },
			{ id: testNoteId }
		);
		const response = await toggleNotePin(params);
		expect(response.status).toBe(401);
	});

	it('should return 404 if the note does not exist', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const nonExistentId = ulid();
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${nonExistentId}/pin`,
			'POST',
			mockSession,
			{ pinned: true },
			{ id: nonExistentId }
		);
		const response = await toggleNotePin(params);
		expect(response.status).toBe(404);
	});

	it('should return 404 and not modify the note when it belongs to another user', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${otherUserNoteId}/pin`,
			'POST',
			mockSession,
			{ pinned: true },
			{ id: otherUserNoteId }
		);
		const response = await toggleNotePin(params);
		expect(response.status).toBe(404);

		// 別ユーザーのノートは変更されていないことを確認
		const fetchedNote = await db
			.select({ isPinned: notes.isPinned })
			.from(notes)
			.where(eq(notes.id, otherUserNoteId))
			.limit(1)
			.get();
		expect(fetchedNote?.isPinned).toBe(false);
	});

	it('should pin the note and persist the change in the database', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${testNoteId}/pin`,
			'POST',
			mockSession,
			{ pinned: true },
			{ id: testNoteId }
		);
		const response = await toggleNotePin(params);
		expect(response.status).toBe(200);
		const body: { success: boolean; isPinned: boolean } = await response.json();
		expect(body.success).toBe(true);
		expect(body.isPinned).toBe(true);

		const fetchedNote = await db
			.select({ isPinned: notes.isPinned })
			.from(notes)
			.where(eq(notes.id, testNoteId))
			.limit(1)
			.get();
		expect(fetchedNote?.isPinned).toBe(true);
	});

	it('should unpin the note and persist the change in the database', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${testNoteId}/pin`,
			'POST',
			mockSession,
			{ pinned: false },
			{ id: testNoteId }
		);
		const response = await toggleNotePin(params);
		expect(response.status).toBe(200);
		const body: { success: boolean; isPinned: boolean } = await response.json();
		expect(body.success).toBe(true);
		expect(body.isPinned).toBe(false);

		const fetchedNote = await db
			.select({ isPinned: notes.isPinned })
			.from(notes)
			.where(eq(notes.id, testNoteId))
			.limit(1)
			.get();
		expect(fetchedNote?.isPinned).toBe(false);
	});
});
