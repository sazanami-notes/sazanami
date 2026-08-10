import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { notes, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { GET as getEncounter } from '../../src/routes/api/notes/encounter/+server';
import { POST as postFeedback } from '../../src/routes/api/notes/[id]/encounter-feedback/+server';

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

// APIレスポンスの緩い型（テスト用）
type EncounterApiResponse = {
	note?: { id: string; encounterCount: number; encounterBoost: number } | null;
	success?: boolean;
	encounterBoost?: number;
};

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
		platform: { env: { DB: {} } },
		route: {
			id: '/api/notes/encounter'
		},
		setHeaders: vi.fn(),
		isDataRequest: false,
		isSubRequest: false
	} as unknown as RequestEvent;
};

describe('GET /api/notes/encounter', () => {
	let testUserId: string;
	let noteId: string;

	beforeAll(async () => {
		testUserId = ulid();
		mockSession.user.id = testUserId;
		mockSession.session.userId = testUserId;

		await db.insert(user).values({
			id: testUserId,
			name: 'Test User',
			email: `encounter-${testUserId}@test.com`,
			emailVerified: false,
			createdAt: new Date(),
			updatedAt: new Date()
		});
	});

	afterAll(async () => {
		await db.delete(notes).where(eq(notes.userId, testUserId));
		await db.delete(user).where(eq(user.id, testUserId));
	});

	it('未認証なら401を返す', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(null);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/encounter',
			'GET',
			null
		);
		const response = await getEncounter(params as Parameters<typeof getEncounter>[0]);
		expect(response.status).toBe(401);
	});

	it('候補ノートが無ければ note: null を返す', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/encounter',
			'GET',
			mockSession
		);
		const response = await getEncounter(params as Parameters<typeof getEncounter>[0]);
		expect(response.status).toBe(200);
		const body = (await response.json()) as EncounterApiResponse;
		expect(body.note).toBeNull();
	});

	it('ノートがあれば1件返し、encounterCountが1になる', async () => {
		// テスト用ノートを作成（inbox・lastEncounteredAtなし）
		const insertResult = await db
			.insert(notes)
			.values({
				userId: testUserId,
				title: 'Encounter Test Note',
				slug: `encounter-test-${ulid()}`,
				content: '昔書いたノートと出会うテスト',
				status: 'inbox',
				createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3日前
				updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
			})
			.returning({ id: notes.id });
		noteId = insertResult[0].id;

		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/encounter',
			'GET',
			mockSession
		);
		const response = await getEncounter(params as Parameters<typeof getEncounter>[0]);
		expect(response.status).toBe(200);
		const body = (await response.json()) as EncounterApiResponse;
		expect(body.note).not.toBeNull();
		expect(body.note!.id).toBe(noteId);
		expect(body.note!.encounterCount).toBe(1);

		// DB上のencounterCountが更新されている
		const dbNote = await db
			.select({ encounterCount: notes.encounterCount, lastEncounteredAt: notes.lastEncounteredAt })
			.from(notes)
			.where(eq(notes.id, noteId))
			.limit(1);
		expect(dbNote[0].encounterCount).toBe(1);
		expect(dbNote[0].lastEncounteredAt).not.toBeNull();
	});

	it('クーリングオフ中（表示直後）は候補を返さない', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/encounter',
			'GET',
			mockSession
		);
		const response = await getEncounter(params as Parameters<typeof getEncounter>[0]);
		expect(response.status).toBe(200);
		const body = (await response.json()) as EncounterApiResponse;
		expect(body.note).toBeNull();
	});

	it('archived/trashのノートは候補にならない', async () => {
		// ステータスをtrashに変更
		await db
			.update(notes)
			.set({ status: 'trash', lastEncounteredAt: null, encounterCount: 0 })
			.where(eq(notes.id, noteId));

		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/encounter',
			'GET',
			mockSession
		);
		const response = await getEncounter(params as Parameters<typeof getEncounter>[0]);
		const body = (await response.json()) as EncounterApiResponse;
		expect(body.note).toBeNull();
	});
});

describe('POST /api/notes/{id}/encounter-feedback', () => {
	let testUserId: string;
	let noteId: string;

	beforeAll(async () => {
		testUserId = ulid();
		mockSession.user.id = testUserId;
		mockSession.session.userId = testUserId;

		await db.insert(user).values({
			id: testUserId,
			name: 'Test User B',
			email: `feedback-${testUserId}@test.com`,
			emailVerified: false,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		const insertResult = await db
			.insert(notes)
			.values({
				userId: testUserId,
				title: 'Feedback Note',
				slug: `feedback-${ulid()}`,
				content: 'フィードバックテスト',
				status: 'inbox',
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.returning({ id: notes.id });
		noteId = insertResult[0].id;
	});

	afterAll(async () => {
		await db.delete(notes).where(eq(notes.userId, testUserId));
		await db.delete(user).where(eq(user.id, testUserId));
	});

	it('未認証なら401を返す', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(null);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${noteId}/encounter-feedback`,
			'POST',
			null,
			{ action: 'like' },
			{ id: noteId }
		);
		const response = await postFeedback(params as Parameters<typeof postFeedback>[0]);
		expect(response.status).toBe(401);
	});

	it('actionが不正なら400を返す', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${noteId}/encounter-feedback`,
			'POST',
			mockSession,
			{ action: 'hug' },
			{ id: noteId }
		);
		const response = await postFeedback(params as Parameters<typeof postFeedback>[0]);
		expect(response.status).toBe(400);
	});

	it('likeでencounterBoostが+1される', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${noteId}/encounter-feedback`,
			'POST',
			mockSession,
			{ action: 'like' },
			{ id: noteId }
		);
		const response = await postFeedback(params as Parameters<typeof postFeedback>[0]);
		expect(response.status).toBe(200);
		const body = (await response.json()) as EncounterApiResponse;
		expect(body.encounterBoost).toBe(1);

		const dbNote = await db
			.select({ encounterBoost: notes.encounterBoost })
			.from(notes)
			.where(eq(notes.id, noteId))
			.limit(1);
		expect(dbNote[0].encounterBoost).toBe(1);
	});

	it('skipでencounterBoostが-1される', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${noteId}/encounter-feedback`,
			'POST',
			mockSession,
			{ action: 'skip' },
			{ id: noteId }
		);
		const response = await postFeedback(params as Parameters<typeof postFeedback>[0]);
		expect(response.status).toBe(200);
		const body = (await response.json()) as EncounterApiResponse;
		expect(body.encounterBoost).toBe(0);

		const dbNote = await db
			.select({ encounterBoost: notes.encounterBoost })
			.from(notes)
			.where(eq(notes.id, noteId))
			.limit(1);
		expect(dbNote[0].encounterBoost).toBe(0);
	});

	it('存在しないノートなら404を返す', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/does-not-exist/encounter-feedback',
			'POST',
			mockSession,
			{ action: 'like' },
			{ id: 'does-not-exist' }
		);
		const response = await postFeedback(params as Parameters<typeof postFeedback>[0]);
		expect(response.status).toBe(404);
	});
});
