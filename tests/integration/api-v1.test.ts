import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { apiTokens, notes, user, tags, noteTags } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { generateRawToken, sha256Hex } from '$lib/server/api-auth';
import { GET as listNotes, POST as createNote } from '../../src/routes/api/v1/notes/+server';
import { POST as importNotes } from '../../src/routes/api/v1/import/+server';
import {
	GET as getNote,
	PUT as putNote,
	DELETE as deleteNote
} from '../../src/routes/api/v1/notes/[id]/+server';
import { GET as searchNotes } from '../../src/routes/api/v1/search/+server';
import { GET as getMe } from '../../src/routes/api/v1/me/+server';

const userId = ulid();
const writeToken = generateRawToken();
const readToken = generateRawToken();
const revokedToken = generateRawToken();

function makeEvent(
	url: string,
	method: string,
	token?: string,
	body?: unknown,
	params?: Record<string, string>
): never {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (token) headers.Authorization = `Bearer ${token}`;
	const request = new Request(url, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	return {
		request,
		url: new URL(url),
		params: params ?? {},
		cookies: { get: () => undefined, set: () => undefined, delete: () => undefined },
		locals: {},
		platform: { env: {} }
	} as unknown as never;
}

async function json(res: Response) {
	return (await res.json()) as Record<string, unknown>;
}

describe('API v1（Bearer認証・スコープ・CRUD）', () => {
	beforeAll(async () => {
		const now = new Date();
		await db.insert(user).values({
			id: userId,
			name: 'API Test User',
			email: `api-${userId}@example.com`,
			emailVerified: false,
			createdAt: now,
			updatedAt: now
		});

		await db.insert(apiTokens).values([
			{
				id: ulid(),
				userId,
				name: 'write token',
				tokenHash: await sha256Hex(writeToken),
				prefix: 'sznm_write…',
				scopes: 'read,write',
				createdAt: now
			},
			{
				id: ulid(),
				userId,
				name: 'read token',
				tokenHash: await sha256Hex(readToken),
				prefix: 'sznm_read…',
				scopes: 'read',
				createdAt: now
			},
			{
				id: ulid(),
				userId,
				name: 'revoked token',
				tokenHash: await sha256Hex(revokedToken),
				prefix: 'sznm_revo…',
				scopes: 'read,write',
				revokedAt: now,
				createdAt: now
			}
		]);
	});

	afterAll(async () => {
		await db.delete(apiTokens).where(eq(apiTokens.userId, userId));
		await db.delete(notes).where(eq(notes.userId, userId));
		await db.delete(user).where(eq(user.id, userId));
	});

	it('トークン無しは401', async () => {
		const res = await listNotes(makeEvent('http://x/api/v1/notes', 'GET'));
		expect(res.status).toBe(401);
	});

	it('失効済みトークンは401', async () => {
		const res = await listNotes(makeEvent('http://x/api/v1/notes', 'GET', revokedToken));
		expect(res.status).toBe(401);
	});

	it('GET /me はユーザーを返す', async () => {
		const res = await getMe(makeEvent('http://x/api/v1/me', 'GET', readToken));
		expect(res.status).toBe(200);
		const body = await json(res);
		const u = body.user as { id: string; name: string };
		expect(u.id).toBe(userId);
		expect(u.name).toBe('API Test User');
	});

	it('readスコープでは作成できない（403）', async () => {
		const res = await createNote(
			makeEvent('http://x/api/v1/notes', 'POST', readToken, { title: 'だめ', status: 'inbox' })
		);
		expect(res.status).toBe(403);
		const body = await json(res);
		expect((body.error as { code: string }).code).toBe('insufficient_scope');
	});

	let createdId = '';

	it('writeスコープでノートを作成できる', async () => {
		const res = await createNote(
			makeEvent('http://x/api/v1/notes', 'POST', writeToken, {
				title: 'APIから作ったノート',
				content: '本文です。[[別ノート]]',
				status: 'box',
				tags: ['api', 'test']
			})
		);
		expect(res.status).toBe(201);
		const body = await json(res);
		const note = body.note as { id: string; title: string; tags: string[]; status: string };
		createdId = note.id;
		expect(note.title).toBe('APIから作ったノート');
		expect(note.status).toBe('box');
		expect(note.tags.sort()).toEqual(['api', 'test']);
	});

	it('一覧はcontentを返さずexcerptを返す', async () => {
		const res = await listNotes(makeEvent('http://x/api/v1/notes?status=box', 'GET', readToken));
		expect(res.status).toBe(200);
		const body = await json(res);
		const list = body.notes as Array<Record<string, unknown>>;
		expect(list.length).toBe(1);
		expect(list[0].content).toBeUndefined();
		expect(typeof list[0].excerpt).toBe('string');
		expect(body.total).toBe(1);
	});

	it('include=content で本文が入る', async () => {
		const res = await listNotes(
			makeEvent('http://x/api/v1/notes?status=box&include=content', 'GET', readToken)
		);
		const body = await json(res);
		const list = body.notes as Array<Record<string, unknown>>;
		expect(list[0].content).toContain('本文です');
	});

	it('単体取得はcontentを含む', async () => {
		const res = await getNote(
			makeEvent(`http://x/api/v1/notes/${createdId}`, 'GET', readToken, undefined, {
				id: createdId
			})
		);
		expect(res.status).toBe(200);
		const body = await json(res);
		expect((body.note as { content: string }).content).toContain('本文です');
	});

	it('存在しないIDは404', async () => {
		const res = await getNote(
			makeEvent('http://x/api/v1/notes/notexist', 'GET', readToken, undefined, { id: 'notexist' })
		);
		expect(res.status).toBe(404);
	});

	it('更新でタイトルとslugが変わる', async () => {
		const res = await putNote(
			makeEvent(
				`http://x/api/v1/notes/${createdId}`,
				'PUT',
				writeToken,
				{ title: 'API更新後' },
				{
					id: createdId
				}
			)
		);
		expect(res.status).toBe(200);
		const body = await json(res);
		const note = body.note as { title: string; slug: string; isPinned: boolean };
		expect(note.title).toBe('API更新後');
		expect(note.slug.length).toBeGreaterThan(0);
	});

	it('PUTにwriteスコープが必要', async () => {
		const res = await putNote(
			makeEvent(
				`http://x/api/v1/notes/${createdId}`,
				'PUT',
				readToken,
				{ title: 'x' },
				{
					id: createdId
				}
			)
		);
		expect(res.status).toBe(403);
	});

	it('検索でヒットする', async () => {
		const res = await searchNotes(makeEvent('http://x/api/v1/search?q=API更新', 'GET', readToken));
		expect(res.status).toBe(200);
		const body = await json(res);
		expect((body.notes as unknown[]).length).toBe(1);
		expect(body.q).toBe('API更新');
	});

	it('qが無い検索は400', async () => {
		const res = await searchNotes(makeEvent('http://x/api/v1/search', 'GET', readToken));
		expect(res.status).toBe(400);
	});

	it('DELETEは既定でゴミ箱へ', async () => {
		const res = await deleteNote(
			makeEvent(`http://x/api/v1/notes/${createdId}`, 'DELETE', writeToken, undefined, {
				id: createdId
			})
		);
		expect(res.status).toBe(200);
		const body = await json(res);
		expect(body.permanent).toBe(false);

		const [row] = await db
			.select({ status: notes.status })
			.from(notes)
			.where(eq(notes.id, createdId));
		expect(row.status).toBe('trash');
	});

	it('永久削除で行が消える', async () => {
		const res = await deleteNote(
			makeEvent(
				`http://x/api/v1/notes/${createdId}?permanent=true`,
				'DELETE',
				writeToken,
				undefined,
				{ id: createdId }
			)
		);
		expect(res.status).toBe(200);
		const [row] = await db.select({ id: notes.id }).from(notes).where(eq(notes.id, createdId));
		expect(row).toBeUndefined();
	});

	it('インポートでタグをまとめて作成し、2件目以降は同じタグを再利用する', async () => {
		const res = await importNotes(
			makeEvent('http://x/api/v1/import', 'POST', writeToken, {
				notes: [
					{ title: '取込A', content: '本文A', status: 'box', tags: ['imp', 'shared'] },
					{ title: '取込B', content: '本文B', status: 'box', tags: ['shared', 'imp2'] }
				]
			})
		);
		expect(res.status).toBe(200);
		const body = await json(res);
		expect(body.imported).toBe(2);

		const rows = await db
			.select({ id: notes.id })
			.from(notes)
			.where(and(eq(notes.userId, userId), inArray(notes.title, ['取込A', '取込B'])));
		expect(rows.length).toBe(2);

		const tagRows = await db
			.select({ name: tags.name })
			.from(noteTags)
			.innerJoin(tags, eq(noteTags.tagId, tags.id))
			.where(
				inArray(
					noteTags.noteId,
					rows.map((row) => row.id)
				)
			);
		expect(tagRows.map((row) => row.name).sort()).toEqual(['imp', 'imp2', 'shared', 'shared']);

		// 後始末（タグは全体で共有なので消しておく）
		await db.delete(tags).where(inArray(tags.name, ['imp', 'imp2', 'shared']));
	});

	it('他人のノートは404（所有チェック）', async () => {
		const otherUserId = ulid();
		const now = new Date();
		await db.insert(user).values({
			id: otherUserId,
			name: 'Other',
			email: `other-${otherUserId}@example.com`,
			emailVerified: false,
			createdAt: now,
			updatedAt: now
		});
		const otherNoteId = ulid();
		await db.insert(notes).values({
			id: otherNoteId,
			userId: otherUserId,
			title: '他人のノート',
			slug: otherNoteId,
			content: 'secret',
			createdAt: now,
			updatedAt: now,
			status: 'box'
		});

		const res = await getNote(
			makeEvent(`http://x/api/v1/notes/${otherNoteId}`, 'GET', readToken, undefined, {
				id: otherNoteId
			})
		);
		expect(res.status).toBe(404);

		await db.delete(notes).where(inArray(notes.id, [otherNoteId]));
		await db.delete(user).where(eq(user.id, otherUserId));
	});
});
