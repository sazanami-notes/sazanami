import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { notes, user, noteLinks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { generateSlug } from '$lib/utils/slug';
import type { RequestEvent } from '@sveltejs/kit';
import { GET as searchNotes } from '../../src/routes/api/notes/+server';
import { GET as getNoteLinks } from '../../src/routes/api/notes/[id]/links/+server';
import { GET as getSuggestions } from '../../src/routes/api/notes/suggestions/+server';
import { GET as getEmbedNote } from '../../src/routes/api/notes/embed/+server';

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
	params?: Record<string, string>
): Promise<RequestEvent> => {
	const request = new Request(url, { method, headers: { 'Content-Type': 'application/json' } });

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
	content: string | null;
	createdAt: string;
	updatedAt: string;
	isPublic: boolean;
	slug: string;
	tags?: string[];
}

interface NotesListResponse {
	notes: NoteResponse[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

interface LinksResponse {
	oneHopLinks: NoteResponse[];
	backlinks: NoteResponse[];
	twoHopLinks: NoteResponse[];
}

interface SuggestionResponse {
	id: string;
	title: string;
	slug: string;
	status: string;
}

interface EmbedResponse {
	id: string;
	title: string;
	content: string | null;
	message?: string;
}

describe('GET /api/notes (search + pagination)', () => {
	let testUserId: string;
	const noteIds: Record<string, string> = {};

	beforeAll(async () => {
		testUserId = ulid();
		mockSession.user.id = testUserId;
		mockSession.session.userId = testUserId;

		await db
			.insert(user)
			.values({
				id: testUserId,
				email: 'search-links-test@example.com',
				name: 'Test User',
				emailVerified: false,
				twoFactorEnabled: false,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.onConflictDoNothing();

		const seedNotes = [
			{
				title: 'Alpha Notes',
				status: 'box',
				content: 'About [[Beta Plans]] and more.',
				updatedAt: new Date(2023, 0, 4, 10, 0, 0)
			},
			{
				title: 'Beta Plans',
				status: 'inbox',
				content: 'This has special keyword here.',
				updatedAt: new Date(2023, 0, 3, 10, 0, 0)
			},
			{
				title: 'Gamma Ideas',
				status: 'box',
				content: 'Plain gamma content.',
				updatedAt: new Date(2023, 0, 2, 10, 0, 0)
			},
			{
				title: 'Delta Notes',
				status: 'inbox',
				content: 'Plain delta content.',
				updatedAt: new Date(2023, 0, 1, 10, 0, 0)
			}
		];

		for (const n of seedNotes) {
			const id = ulid();
			noteIds[n.title] = id;
			await db.insert(notes).values({
				id,
				userId: testUserId,
				title: n.title,
				slug: generateSlug(n.title),
				content: n.content,
				isPublic: false,
				status: n.status,
				createdAt: n.updatedAt,
				updatedAt: n.updatedAt
			});
		}

		// noteA (Alpha Notes) から noteB (Beta Plans) へのリンクをコンテンツから生成
		await db.insert(noteLinks).values({
			id: ulid(),
			sourceNoteId: noteIds['Alpha Notes'],
			targetNoteId: noteIds['Beta Plans'],
			createdAt: new Date()
		});
		// noteC (Gamma Ideas) から noteA (Alpha Notes) へのリンク（バックリンク用）
		await db.insert(noteLinks).values({
			id: ulid(),
			sourceNoteId: noteIds['Gamma Ideas'],
			targetNoteId: noteIds['Alpha Notes'],
			createdAt: new Date()
		});
	});

	afterAll(async () => {
		await db.delete(noteLinks);
		await db.delete(notes).where(eq(notes.userId, testUserId));
		await db.delete(user).where(eq(user.id, testUserId));
	});

	it('should return 401 if unauthorized', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(null);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes?search=Alpha',
			'GET',
			null
		);
		const response = await searchNotes(params as Parameters<typeof searchNotes>[0]);
		expect(response.status).toBe(401);
	});

	it('should find notes by title with search query', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes?search=Alpha',
			'GET',
			mockSession
		);
		const response = await searchNotes(params as Parameters<typeof searchNotes>[0]);
		expect(response.status).toBe(200);
		const body: NotesListResponse = await response.json();
		expect(body.notes).toHaveLength(1);
		expect(body.notes[0].id).toBe(noteIds['Alpha Notes']);
		expect(body.notes[0].title).toBe('Alpha Notes');
		expect(body.pagination.total).toBe(1);
		expect(body.pagination.totalPages).toBe(1);
	});

	it('should find notes by content with search query', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes?search=special',
			'GET',
			mockSession
		);
		const response = await searchNotes(params as Parameters<typeof searchNotes>[0]);
		expect(response.status).toBe(200);
		const body: NotesListResponse = await response.json();
		expect(body.notes).toHaveLength(1);
		expect(body.notes[0].id).toBe(noteIds['Beta Plans']);
		expect(body.notes[0].content).toContain('special keyword');
	});

	it('should return an empty array when the search query matches nothing', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes?search=noSuchTerm',
			'GET',
			mockSession
		);
		const response = await searchNotes(params as Parameters<typeof searchNotes>[0]);
		expect(response.status).toBe(200);
		const body: NotesListResponse = await response.json();
		expect(body.notes).toEqual([]);
		expect(body.pagination.total).toBe(0);
		expect(body.pagination.totalPages).toBe(0);
	});

	it('should paginate results with page and limit', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const page1Params = await createMockRequestHandlerParams(
			'http://localhost/api/notes?limit=2&page=1',
			'GET',
			mockSession
		);
		const page1Response = await searchNotes(page1Params);
		expect(page1Response.status).toBe(200);
		const page1Body: NotesListResponse = await page1Response.json();
		expect(page1Body.notes).toHaveLength(2);
		expect(page1Body.notes[0].title).toBe('Alpha Notes');
		expect(page1Body.notes[1].title).toBe('Beta Plans');
		expect(page1Body.pagination).toEqual({
			page: 1,
			limit: 2,
			total: 4,
			totalPages: 2
		});

		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const page2Params = await createMockRequestHandlerParams(
			'http://localhost/api/notes?limit=2&page=2',
			'GET',
			mockSession
		);
		const page2Response = await searchNotes(page2Params);
		expect(page2Response.status).toBe(200);
		const page2Body: NotesListResponse = await page2Response.json();
		expect(page2Body.notes).toHaveLength(2);
		expect(page2Body.notes[0].title).toBe('Gamma Ideas');
		expect(page2Body.notes[1].title).toBe('Delta Notes');
		expect(page2Body.pagination.page).toBe(2);
		expect(page2Body.pagination.total).toBe(4);
		expect(page2Body.pagination.totalPages).toBe(2);
	});

	it('should set totalPages equal to total when limit is 1', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes?limit=1&page=1',
			'GET',
			mockSession
		);
		const response = await searchNotes(params as Parameters<typeof searchNotes>[0]);
		expect(response.status).toBe(200);
		const body: NotesListResponse = await response.json();
		expect(body.notes).toHaveLength(1);
		expect(body.pagination.limit).toBe(1);
		expect(body.pagination.total).toBe(4);
		expect(body.pagination.totalPages).toBe(4);
		expect(body.pagination.totalPages).toBe(body.pagination.total);
	});
});

describe('GET /api/notes (empty state)', () => {
	let testUserId: string;

	beforeAll(async () => {
		testUserId = ulid();
		mockSession.user.id = testUserId;
		mockSession.session.userId = testUserId;

		await db
			.insert(user)
			.values({
				id: testUserId,
				email: 'search-links-empty@example.com',
				name: 'Test User',
				emailVerified: false,
				twoFactorEnabled: false,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.onConflictDoNothing();
	});

	afterAll(async () => {
		await db.delete(user).where(eq(user.id, testUserId));
	});

	it('should return an empty list and zero pagination when the user has no notes', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes',
			'GET',
			mockSession
		);
		const response = await searchNotes(params as Parameters<typeof searchNotes>[0]);
		expect(response.status).toBe(200);
		const body: NotesListResponse = await response.json();
		expect(body.notes).toEqual([]);
		expect(body.pagination.total).toBe(0);
		expect(body.pagination.totalPages).toBe(0);
	});
});

describe('GET /api/notes/[id]/links', () => {
	let testUserId: string;
	const noteIds: Record<string, string> = {};

	beforeAll(async () => {
		testUserId = ulid();
		mockSession.user.id = testUserId;
		mockSession.session.userId = testUserId;

		await db
			.insert(user)
			.values({
				id: testUserId,
				email: 'search-links-links@example.com',
				name: 'Test User',
				emailVerified: false,
				twoFactorEnabled: false,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.onConflictDoNothing();

		const seedNotes = [
			{ title: 'Source Note', status: 'inbox', content: 'Links to [[Target Note]].' },
			{ title: 'Target Note', status: 'inbox', content: 'Plain content.' },
			{ title: 'Backlink Note', status: 'inbox', content: 'Points back to [[Source Note]].' },
			{ title: 'Isolated Note', status: 'inbox', content: 'No links at all.' }
		];

		for (const n of seedNotes) {
			const id = ulid();
			noteIds[n.title] = id;
			await db.insert(notes).values({
				id,
				userId: testUserId,
				title: n.title,
				slug: generateSlug(n.title),
				content: n.content,
				isPublic: false,
				status: n.status,
				createdAt: new Date(),
				updatedAt: new Date()
			});
		}

		// Source Note -> Target Note (1-hop)
		await db.insert(noteLinks).values({
			id: ulid(),
			sourceNoteId: noteIds['Source Note'],
			targetNoteId: noteIds['Target Note'],
			createdAt: new Date()
		});
		// Backlink Note -> Source Note (backlink of Source Note)
		await db.insert(noteLinks).values({
			id: ulid(),
			sourceNoteId: noteIds['Backlink Note'],
			targetNoteId: noteIds['Source Note'],
			createdAt: new Date()
		});
	});

	afterAll(async () => {
		await db.delete(noteLinks);
		await db.delete(notes).where(eq(notes.userId, testUserId));
		await db.delete(user).where(eq(user.id, testUserId));
	});

	it('should return 401 if unauthorized', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(null);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${noteIds['Source Note']}/links`,
			'GET',
			null,
			{ id: noteIds['Source Note'] }
		);
		const response = await getNoteLinks(params as Parameters<typeof getNoteLinks>[0]);
		expect(response.status).toBe(401);
	});

	it('should return oneHopLinks, backlinks and twoHopLinks for a note with links', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${noteIds['Source Note']}/links`,
			'GET',
			mockSession,
			{ id: noteIds['Source Note'] }
		);
		const response = await getNoteLinks(params as Parameters<typeof getNoteLinks>[0]);
		expect(response.status).toBe(200);
		const body: LinksResponse = await response.json();

		expect(body.oneHopLinks).toHaveLength(1);
		expect(body.oneHopLinks[0].id).toBe(noteIds['Target Note']);
		expect(body.oneHopLinks[0].title).toBe('Target Note');

		expect(body.backlinks).toHaveLength(1);
		expect(body.backlinks[0].id).toBe(noteIds['Backlink Note']);
		expect(body.backlinks[0].title).toBe('Backlink Note');

		expect(Array.isArray(body.twoHopLinks)).toBe(true);
	});

	it('should return empty arrays for a note without links', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			`http://localhost/api/notes/${noteIds['Isolated Note']}/links`,
			'GET',
			mockSession,
			{ id: noteIds['Isolated Note'] }
		);
		const response = await getNoteLinks(params as Parameters<typeof getNoteLinks>[0]);
		expect(response.status).toBe(200);
		const body: LinksResponse = await response.json();
		expect(body.oneHopLinks).toEqual([]);
		expect(body.backlinks).toEqual([]);
		expect(body.twoHopLinks).toEqual([]);
	});
});

describe('GET /api/notes/suggestions', () => {
	let testUserId: string;
	const noteIds: Record<string, string> = {};

	beforeAll(async () => {
		testUserId = ulid();
		mockSession.user.id = testUserId;
		mockSession.session.userId = testUserId;

		await db
			.insert(user)
			.values({
				id: testUserId,
				email: 'search-links-suggestions@example.com',
				name: 'Test User',
				emailVerified: false,
				twoFactorEnabled: false,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.onConflictDoNothing();

		const seedNotes = [
			{
				title: 'Suggest Alpha',
				status: 'box',
				content: 'Content A.',
				updatedAt: new Date(2023, 0, 3, 10, 0, 0)
			},
			{
				title: 'Suggest Beta',
				status: 'box',
				content: 'Content B.',
				updatedAt: new Date(2023, 0, 2, 10, 0, 0)
			},
			{
				title: 'Suggest Gamma',
				status: 'inbox',
				content: 'Content C.',
				updatedAt: new Date(2023, 0, 1, 10, 0, 0)
			}
		];

		for (const n of seedNotes) {
			const id = ulid();
			noteIds[n.title] = id;
			await db.insert(notes).values({
				id,
				userId: testUserId,
				title: n.title,
				slug: generateSlug(n.title),
				content: n.content,
				isPublic: false,
				status: n.status,
				createdAt: n.updatedAt,
				updatedAt: n.updatedAt
			});
		}
	});

	afterAll(async () => {
		await db.delete(notes).where(eq(notes.userId, testUserId));
		await db.delete(user).where(eq(user.id, testUserId));
	});

	it('should return 401 if unauthorized', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(null);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/suggestions?q=Alpha',
			'GET',
			null
		);
		const response = await getSuggestions(params as Parameters<typeof getSuggestions>[0]);
		expect(response.status).toBe(401);
	});

	it('should return matching suggestions for the query', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/suggestions?q=Alpha',
			'GET',
			mockSession
		);
		const response = await getSuggestions(params as Parameters<typeof getSuggestions>[0]);
		expect(response.status).toBe(200);
		const body: SuggestionResponse[] = await response.json();
		expect(body).toHaveLength(1);
		expect(body[0].id).toBe(noteIds['Suggest Alpha']);
		expect(body[0].title).toBe('Suggest Alpha');
		expect(body[0].status).toBe('box');
	});

	it('should only return box notes by default (scope=box)', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/suggestions?q=Gamma',
			'GET',
			mockSession
		);
		const response = await getSuggestions(params as Parameters<typeof getSuggestions>[0]);
		expect(response.status).toBe(200);
		const body: SuggestionResponse[] = await response.json();
		// Suggest Gamma は inbox のため、box スコープでは候補に出ない
		expect(body).toEqual([]);
	});

	it('should return notes of all statuses when scope=all and a query is given', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/suggestions?q=Gamma&scope=all',
			'GET',
			mockSession
		);
		const response = await getSuggestions(params as Parameters<typeof getSuggestions>[0]);
		expect(response.status).toBe(200);
		const body: SuggestionResponse[] = await response.json();
		expect(body).toHaveLength(1);
		expect(body[0].id).toBe(noteIds['Suggest Gamma']);
		expect(body[0].title).toBe('Suggest Gamma');
		expect(body[0].status).toBe('inbox');
	});

	it('should return notes of all statuses when scope=all and no query is given', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/suggestions?scope=all',
			'GET',
			mockSession
		);
		const response = await getSuggestions(params as Parameters<typeof getSuggestions>[0]);
		expect(response.status).toBe(200);
		const body: SuggestionResponse[] = await response.json();
		expect(body).toHaveLength(3);
		const titles = body.map((s) => s.title);
		expect(titles).toContain('Suggest Alpha');
		expect(titles).toContain('Suggest Beta');
		expect(titles).toContain('Suggest Gamma');
	});

	it('should return an empty array when the query matches nothing', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/suggestions?q=noSuchTerm',
			'GET',
			mockSession
		);
		const response = await getSuggestions(params as Parameters<typeof getSuggestions>[0]);
		expect(response.status).toBe(200);
		const body: SuggestionResponse[] = await response.json();
		expect(body).toEqual([]);
	});

	it('should return all box notes when no query is given', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/suggestions',
			'GET',
			mockSession
		);
		const response = await getSuggestions(params as Parameters<typeof getSuggestions>[0]);
		expect(response.status).toBe(200);
		const body: SuggestionResponse[] = await response.json();
		expect(body).toHaveLength(2);
		const titles = body.map((s) => s.title);
		expect(titles).toContain('Suggest Alpha');
		expect(titles).toContain('Suggest Beta');
	});
});

describe('GET /api/notes/embed', () => {
	let testUserId: string;
	const noteIds: Record<string, string> = {};

	beforeAll(async () => {
		testUserId = ulid();
		mockSession.user.id = testUserId;
		mockSession.session.userId = testUserId;

		await db
			.insert(user)
			.values({
				id: testUserId,
				email: 'search-links-embed@example.com',
				name: 'Test User',
				emailVerified: false,
				twoFactorEnabled: false,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.onConflictDoNothing();

		const id = ulid();
		noteIds['Embed Target'] = id;
		await db.insert(notes).values({
			id,
			userId: testUserId,
			title: 'Embed Target',
			slug: generateSlug('Embed Target'),
			content: 'Content to embed.',
			isPublic: false,
			status: 'inbox',
			createdAt: new Date(),
			updatedAt: new Date()
		});
	});

	afterAll(async () => {
		await db.delete(notes).where(eq(notes.userId, testUserId));
		await db.delete(user).where(eq(user.id, testUserId));
	});

	it('should return 401 if unauthorized', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(null);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/embed?title=Embed%20Target',
			'GET',
			null
		);
		const response = await getEmbedNote(params as Parameters<typeof getEmbedNote>[0]);
		expect(response.status).toBe(401);
	});

	it('should return the note for a matching title (case-insensitive)', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/embed?title=embed%20target',
			'GET',
			mockSession
		);
		const response = await getEmbedNote(params as Parameters<typeof getEmbedNote>[0]);
		expect(response.status).toBe(200);
		const body: EmbedResponse = await response.json();
		expect(body.id).toBe(noteIds['Embed Target']);
		expect(body.title).toBe('Embed Target');
		expect(body.content).toBe('Content to embed.');
	});

	it('should return 404 when the title does not exist', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/embed?title=No%20Such%20Note',
			'GET',
			mockSession
		);
		const response = await getEmbedNote(params as Parameters<typeof getEmbedNote>[0]);
		expect(response.status).toBe(404);
		const body: EmbedResponse = await response.json();
		expect(body.message).toBe('Note not found');
	});

	it('should return 400 when the title parameter is missing', async () => {
		mockAuth.api.getSession.mockResolvedValueOnce(mockSession);
		const params = await createMockRequestHandlerParams(
			'http://localhost/api/notes/embed',
			'GET',
			mockSession
		);
		const response = await getEmbedNote(params as Parameters<typeof getEmbedNote>[0]);
		expect(response.status).toBe(400);
		const body: EmbedResponse = await response.json();
		expect(body.message).toBe('Title is required');
	});
});
