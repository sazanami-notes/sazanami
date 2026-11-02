import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { notes, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { GET as getNote, PUT as updateNote } from '../../src/routes/api/notes/[id]/+server';

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

describe('PUT /api/notes/{id} 公開設定', () => {
	let testUserId: string;
	let otherUserId: string;
	let noteId: string;

	beforeAll(async () => {
		testUserId = ulid();
		otherUserId = ulid();
		mockSession.user.id = testUserId;
		mockSession.session.userId = testUserId;

		await db.insert(user).values([
			{
				id: testUserId,
				name: 'Test User',
				email: `visibility-${testUserId}@test.com`,
				emailVerified: false,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				id: otherUserId,
				name: 'Other User',
				email: `visibility-${otherUserId}@test.com`,
				emailVerified: false,
				createdAt: new Date(),
				updatedAt: new Date()
			}
		]);

		const insertResult = await db
			.insert(notes)
			.values({
				userId: testUserId,
				title: 'Visibility Test Note',
				slug: `visibility-${ulid()}`,
				content: '本文',
				status: 'box',
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.returning({ id: notes.id });
		noteId = insertResult[0].id;
	});

	afterAll(async () => {
		await db.delete(notes).where(eq(notes.userId, testUserId));
		await db.delete(user).where(eq(user.id, testUserId));
		await db.delete(user).where(eq(user.id, otherUserId));
	});

	it('未認証は401', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(null);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${noteId}`,
			'PUT',
			null,
			{ isPublic: true },
			{ id: noteId }
		);
		const response = await updateNote(params as Parameters<typeof updateNote>[0]);
		expect(response.status).toBe(401);
	});

	it('デフォルトは非公開', async () => {
		const dbNote = await db
			.select({ isPublic: notes.isPublic })
			.from(notes)
			.where(eq(notes.id, noteId))
			.limit(1);
		expect(dbNote[0].isPublic).toBe(false);
	});

	it('isPublic:true で公開にできる', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${noteId}`,
			'PUT',
			mockSession,
			{ isPublic: true },
			{ id: noteId }
		);
		const response = await updateNote(params as Parameters<typeof updateNote>[0]);
		expect(response.status).toBe(200);
		const body = (await response.json()) as { isPublic: boolean };
		expect(body.isPublic).toBe(true);

		const dbNote = await db
			.select({ isPublic: notes.isPublic })
			.from(notes)
			.where(eq(notes.id, noteId))
			.limit(1);
		expect(dbNote[0].isPublic).toBe(true);
	});

	it('isPublic:false で非公開に戻せる', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${noteId}`,
			'PUT',
			mockSession,
			{ isPublic: false },
			{ id: noteId }
		);
		const response = await updateNote(params as Parameters<typeof updateNote>[0]);
		expect(response.status).toBe(200);

		const dbNote = await db
			.select({ isPublic: notes.isPublic })
			.from(notes)
			.where(eq(notes.id, noteId))
			.limit(1);
		expect(dbNote[0].isPublic).toBe(false);
	});

	it('isPublicを送らない更新では公開設定は変わらない', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const first = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${noteId}`,
			'PUT',
			mockSession,
			{ isPublic: true },
			{ id: noteId }
		);
		await updateNote(first as Parameters<typeof updateNote>[0]);

		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const second = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${noteId}`,
			'PUT',
			mockSession,
			{ title: 'Visibility Test Note (renamed)' },
			{ id: noteId }
		);
		const response = await updateNote(second as Parameters<typeof updateNote>[0]);
		expect(response.status).toBe(200);

		const dbNote = await db
			.select({ isPublic: notes.isPublic, title: notes.title })
			.from(notes)
			.where(eq(notes.id, noteId))
			.limit(1);
		expect(dbNote[0].isPublic).toBe(true);
		expect(dbNote[0].title).toBe('Visibility Test Note (renamed)');
	});

	it('GETで現在の公開設定が返る', async () => {
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
		const body = (await response.json()) as { isPublic: boolean };
		expect(body.isPublic).toBe(true);
	});
});
