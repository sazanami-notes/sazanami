import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { notes, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { PUT as updateNote } from '../../src/routes/api/notes/[id]/+server';
import { GET as getNote } from '../../src/routes/api/notes/[id]/+server';

// Mock the auth module
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
			id: '/api/notes/[id]'
		},
		setHeaders: vi.fn(),
		isDataRequest: false,
		isSubRequest: false
	} as unknown as RequestEvent;
};

describe('PUT /api/notes/{id} context (Layer 1)', () => {
	let testUserId: string;
	let noteId: string;

	beforeAll(async () => {
		testUserId = ulid();
		mockSession.user.id = testUserId;
		mockSession.session.userId = testUserId;

		await db.insert(user).values({
			id: testUserId,
			name: 'Test User',
			email: `context-${testUserId}@test.com`,
			emailVerified: false,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		const insertResult = await db
			.insert(notes)
			.values({
				userId: testUserId,
				title: 'Context Test Note',
				slug: `context-${ulid()}`,
				content: '生メモの内容（不変）',
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

	it('contextを保存できる（生メモcontentは変わらない）', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${noteId}`,
			'PUT',
			mockSession,
			{ context: 'あとで見直したい。通勤中に思いついた。' },
			{ id: noteId }
		);
		const response = await updateNote(params as Parameters<typeof updateNote>[0]);
		expect(response.status).toBe(200);

		const dbNote = await db
			.select({ context: notes.context, content: notes.content })
			.from(notes)
			.where(eq(notes.id, noteId))
			.limit(1);
		expect(dbNote[0].context).toBe('あとで見直したい。通勤中に思いついた。');
		expect(dbNote[0].content).toBe('生メモの内容（不変）'); // 生メモは変わらない
	});

	it('GETでcontextが返る', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${noteId}`,
			'GET',
			mockSession,
			undefined,
			{ id: noteId }
		);
		const response = await getNote(params as Parameters<typeof getNote>[0]);
		expect(response.status).toBe(200);
		const body = (await response.json()) as { context?: string | null };
		expect(body.context).toBe('あとで見直したい。通勤中に思いついた。');
	});

	it('contextをnullにすると消去できる', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${noteId}`,
			'PUT',
			mockSession,
			{ context: null },
			{ id: noteId }
		);
		const response = await updateNote(params as Parameters<typeof updateNote>[0]);
		expect(response.status).toBe(200);

		const dbNote = await db
			.select({ context: notes.context })
			.from(notes)
			.where(eq(notes.id, noteId))
			.limit(1);
		expect(dbNote[0].context).toBeNull();
	});
});
