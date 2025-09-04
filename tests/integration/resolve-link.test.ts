import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { GET } from '../../src/routes/api/notes/resolve-link/+server';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { box, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as authModule from '$lib/server/auth';
import { generateSlug } from '$lib/utils/slug';
import type { RequestEvent } from '@sveltejs/kit';
import type { User, Session } from 'better-auth';

const mockUser = {
	id: 'testUser1',
	email: 'test@example.com',
	name: 'Test User',
	emailVerified: false,
	createdAt: new Date(),
	updatedAt: new Date()
} as User;

const mockSession = {
	user: mockUser,
	session: {
		id: ulid(),
		userId: 'testUser1',
		expiresAt: new Date(Date.now() + 1000 * 60 * 60),
		createdAt: new Date(),
		updatedAt: new Date(),
		token: 'dummy-token'
	} as Session
};

const createMockRequestEvent = (url: string, method: string, session: any): RequestEvent => {
	const request = new Request(url, { method });
	return {
		url: new URL(request.url),
		request: request,
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
			session: session ? session.session : null,
			user: session ? session.user : null
		},
		params: {},
		platform: {},
		route: {
			id: '/api/notes/resolve-link'
		},
		setHeaders: vi.fn(),
		isDataRequest: false
	} as unknown as RequestEvent;
};

interface ResolveLinkResponse {
	id?: string;
	title?: string;
	message?: string;
}

describe('GET /api/notes/resolve-link', () => {
	let testUserId: string;

	beforeAll(async () => {
		testUserId = ulid();
		mockSession.user.id = testUserId;
		mockSession.session.userId = testUserId;

		await db.insert(user).values({ ...mockUser, id: testUserId });

		await db.insert(box).values([
			{
				id: ulid(),
				userId: testUserId,
				title: 'Existing Note',
				content: 'Content of existing note.',
				createdAt: new Date(2023, 0, 1, 10, 0, 0),
				updatedAt: new Date(2023, 0, 1, 10, 0, 0),
				slug: 'existing-note'
			},
			{
				id: ulid(),
				userId: testUserId,
				title: 'Another Note',
				content: 'Content of another note.',
				createdAt: new Date(2023, 0, 2, 10, 0, 0),
				updatedAt: new Date(2023, 0, 2, 10, 0, 0),
				slug: 'another-note'
			},
			{
				id: ulid(),
				userId: testUserId,
				title: 'Test Note for Duplicates A',
				content: 'Content A.',
				createdAt: new Date(2023, 0, 3, 10, 0, 0),
				updatedAt: new Date(2023, 0, 3, 10, 0, 0),
				slug: generateSlug('Test Note for Duplicates A')
			},
			{
				id: ulid(),
				userId: testUserId,
				title: 'Test Note for Duplicates B',
				content: 'Content B.',
				createdAt: new Date(2023, 0, 4, 10, 0, 0),
				updatedAt: new Date(2023, 0, 4, 10, 0, 0),
				slug: generateSlug('Test Note for Duplicates B')
			},
			{
				id: ulid(),
				userId: testUserId,
				title: 'Test Note for Duplicates C',
				content: 'Content C.',
				createdAt: new Date(2023, 0, 5, 10, 0, 0),
				updatedAt: new Date(2023, 0, 5, 10, 0, 0),
				slug: generateSlug('Test Note for Duplicates C')
			}
		]);
	});

	afterAll(async () => {
		await db.delete(box).where(eq(box.userId, testUserId));
		await db.delete(user).where(eq(user.id, testUserId));
	});

	it('should return 401 if unauthorized', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(null);

		const event = createMockRequestEvent(
			'http://localhost/api/notes/resolve-link?title=any',
			'GET',
			null
		);
		const response = await GET(event);
		expect(response.status).toBe(401);
	});

	it('should return 400 if title query parameter is missing', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession);

		const event = createMockRequestEvent(
			'http://localhost/api/notes/resolve-link',
			'GET',
			mockSession
		);
		const response = await GET(event);
		expect(response.status).toBe(400);
	});

	it('should return correct note for an existing title', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession);

		const event = createMockRequestEvent(
			'http://localhost/api/notes/resolve-link?title=Existing Note',
			'GET',
			mockSession
		);
		const response = await GET(event);
		expect(response.status).toBe(200);
		const body: ResolveLinkResponse = await response.json();
		expect(body.title).toBe('Existing Note');
	});

	it('should return 404 if note not found', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession);

		const event = createMockRequestEvent(
			'http://localhost/api/notes/resolve-link?title=NonExistent Note',
			'GET',
			mockSession
		);
		const response = await GET(event);
		expect(response.status).toBe(404);
	});

	it('should return the latest updated note for duplicate titles', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession);

		const event = createMockRequestEvent(
			'http://localhost/api/notes/resolve-link?title=Test Note for Duplicates C',
			'GET',
			mockSession
		);
		const response = await GET(event);
		expect(response.status).toBe(200);
		const body: ResolveLinkResponse = await response.json();
		expect(body.title).toBe('Test Note for Duplicates C');
	});

	it('should handle Japanese titles correctly', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession);

		const japaneseTitle = '日本語のテストノート';
		const japaneseSlug = generateSlug(japaneseTitle);

		await db.insert(box).values({
			id: ulid(),
			userId: testUserId,
			title: japaneseTitle,
			content: '日本語のコンテンツ',
			createdAt: new Date(),
			updatedAt: new Date(),
			slug: japaneseSlug
		});

		const event = createMockRequestEvent(
			`http://localhost/api/notes/resolve-link?title=${encodeURIComponent(japaneseTitle)}`,
			'GET',
			mockSession
		);
		const response = await GET(event);
		expect(response.status).toBe(200);
		const body: ResolveLinkResponse = await response.json();
		expect(body.title).toBe(japaneseTitle);
	});
});