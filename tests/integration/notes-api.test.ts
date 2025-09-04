import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { timeline, box, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as authModule from '$lib/server/auth';
import { generateSlug } from '$lib/utils/slug';
import type { RequestEvent } from '@sveltejs/kit';
import { POST as createTimelinePost, GET as getTimelinePosts } from '../../src/routes/api/notes/+server';
import { PUT as updateBoxNote } from '../../src/routes/api/notes/[id]/+server';
import type { User, Session, TimelinePost, BoxNote } from '$lib/types';

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
		platform: { env: { DB: {} as any } },
		route: {
			id: '/api/notes'
		},
		setHeaders: vi.fn(),
		isDataRequest: false,
		isSubRequest: false
	} as RequestEvent;
};

describe('POST /api/notes (timeline)', () => {
	let testUserId: string;

	beforeAll(async () => {
		testUserId = ulid();
		mockSession.user.id = testUserId;
		mockSession.session.userId = testUserId;

		await db.insert(user).values({ ...mockUser, id: testUserId });
	});

	afterAll(async () => {
		await db.delete(timeline).where(eq(timeline.userId, testUserId));
		await db.delete(user).where(eq(user.id, testUserId));
	});

	it('should create a timeline post', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession);
		const postContent = 'This is a timeline post.';
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes',
			'POST',
			mockSession,
			{ content: postContent }
		);
		const response = await createTimelinePost(params);
		expect(response.status).toBe(201);
		const newPost: TimelinePost = await response.json();
		expect(newPost.content).toBe(postContent);

		const fetchedPost = await db.query.timeline.findFirst({ where: eq(timeline.id, newPost.id) });
		expect(fetchedPost?.content).toBe(postContent);
	});
});

describe('PUT /api/notes/{id} (box)', () => {
	let testUserId: string;
	let existingNoteId: string;

	beforeAll(async () => {
		testUserId = ulid();
		mockSession.user.id = testUserId;
		mockSession.session.userId = testUserId;

		await db.insert(user).values({ ...mockUser, id: testUserId });

		const initialTitle = 'Note to Update';
		existingNoteId = ulid();
		await db.insert(box).values({
			id: existingNoteId,
			userId: testUserId,
			title: initialTitle,
			content: 'Original content',
			createdAt: new Date(),
			updatedAt: new Date(),
			slug: generateSlug(initialTitle)
		});
	});

	afterAll(async () => {
		await db.delete(box).where(eq(box.userId, testUserId));
		await db.delete(user).where(eq(user.id, testUserId));
	});

	it('should update a box note', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValueOnce(mockSession);
		const updatedTitle = 'My Updated Box Note';
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${existingNoteId}`,
			'PUT',
			mockSession,
			{ title: updatedTitle, content: 'Updated content' },
			{ id: existingNoteId }
		);
		const response = await updateBoxNote(params);
		expect(response.status).toBe(200);
		const updatedNote: BoxNote = await response.json();
		expect(updatedNote.title).toBe(updatedTitle);

		const fetchedNote = await db.query.box.findFirst({ where: eq(box.id, existingNoteId) });
		expect(fetchedNote?.title).toBe(updatedTitle);
	});
});