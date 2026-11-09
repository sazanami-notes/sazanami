import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { attachments, noteAttachments, notes, user as userSchema } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import type { User, Session } from 'better-auth';
import { GET } from '../../src/routes/uploads/[...path]/+server';
import { syncNoteAttachments, extractAttachmentIds } from '$lib/server/note-attachments';

const { mockGetSession } = vi.hoisted(() => ({ mockGetSession: vi.fn() }));

vi.mock('$lib/server/auth-session', () => ({
	getSessionCached: mockGetSession
}));

const owner = { id: ulid(), name: 'owner', email: 'owner@example.com' };
const other = { id: ulid(), name: 'other', email: 'other@example.com' };

const ownerSession = {
	user: {
		...owner,
		emailVerified: true,
		twoFactorEnabled: false,
		createdAt: new Date(),
		updatedAt: new Date()
	} as User,
	session: {
		id: ulid(),
		userId: owner.id,
		expiresAt: new Date(Date.now() + 3_600_000),
		createdAt: new Date(),
		updatedAt: new Date(),
		token: 't'
	} as Session
};

function fakeBucket() {
	return {
		get: async () => ({
			body: 'fake-image-bytes',
			size: 16,
			httpEtag: '"etag"',
			httpMetadata: { contentType: 'image/png' }
		})
	};
}

async function callUploads(key: string) {
	const request = new Request(`http://localhost/uploads/${key}`);
	const event = {
		params: { path: key },
		request,
		platform: { env: { R2: fakeBucket() } }
	} as unknown as RequestEvent;
	return GET(event as Parameters<typeof GET>[0]);
}

const privateNoteId = ulid();
const publicNoteId = ulid();
const privateAttachmentId = ulid();
const publicAttachmentId = ulid();

beforeAll(async () => {
	await db.insert(userSchema).values([
		{ id: owner.id, name: owner.name, email: owner.email, emailVerified: true },
		{ id: other.id, name: other.name, email: other.email, emailVerified: true }
	]);

	await db.insert(attachments).values([
		{
			id: privateAttachmentId,
			userId: owner.id,
			fileName: 'private.png',
			filePath: `uploads/${privateAttachmentId}.png`,
			mimeType: 'image/png',
			fileSize: 16,
			createdAt: new Date()
		},
		{
			id: publicAttachmentId,
			userId: owner.id,
			fileName: 'public.png',
			filePath: `uploads/${publicAttachmentId}.png`,
			mimeType: 'image/png',
			fileSize: 16,
			createdAt: new Date()
		}
	]);

	const now = new Date();
	await db.insert(notes).values([
		{
			id: privateNoteId,
			userId: owner.id,
			title: 'private note',
			slug: `private-${privateNoteId}`,
			content: `![](${`/uploads/${privateAttachmentId}.png`})`,
			status: 'box',
			isPublic: false,
			createdAt: now,
			updatedAt: now
		},
		{
			id: publicNoteId,
			userId: owner.id,
			title: 'public note',
			slug: `public-${publicNoteId}`,
			content: `![](${`/uploads/${publicAttachmentId}.png`})`,
			status: 'box',
			isPublic: true,
			createdAt: now,
			updatedAt: now
		}
	]);
});

afterAll(async () => {
	await db.delete(notes).where(eq(notes.userId, owner.id));
	await db.delete(attachments).where(eq(attachments.userId, owner.id));
	await db.delete(userSchema).where(eq(userSchema.id, owner.id));
	await db.delete(userSchema).where(eq(userSchema.id, other.id));
});

describe('extractAttachmentIds', () => {
	it('本文中の /uploads/<ULID>.<ext> を抽出する', () => {
		const id1 = ulid();
		const id2 = ulid();
		const content = `a ![](/uploads/${id1}.png) b /uploads/${id2}.avif c /uploads/notaulid.png`;
		expect(extractAttachmentIds(content).sort()).toEqual([id1, id2].sort());
	});

	it('本文が空なら空配列', () => {
		expect(extractAttachmentIds(null)).toEqual([]);
		expect(extractAttachmentIds('')).toEqual([]);
	});
});

describe('syncNoteAttachments', () => {
	it('本文の参照から紐付けを作り、参照が消えたら外す', async () => {
		await syncNoteAttachments(privateNoteId, owner.id, `/uploads/${privateAttachmentId}.png`);
		let links = await db
			.select()
			.from(noteAttachments)
			.where(eq(noteAttachments.noteId, privateNoteId));
		expect(links).toHaveLength(1);

		await syncNoteAttachments(privateNoteId, owner.id, 'no images here');
		links = await db
			.select()
			.from(noteAttachments)
			.where(eq(noteAttachments.noteId, privateNoteId));
		expect(links).toHaveLength(0);
	});

	it('他人の添付IDは紐付けない', async () => {
		await db.insert(attachments).values({
			id: ulid(),
			userId: other.id,
			fileName: 'other.png',
			filePath: `uploads/${ulid()}.png`,
			mimeType: 'image/png',
			fileSize: 1,
			createdAt: new Date()
		});
		const otherAttachment = await db
			.select()
			.from(attachments)
			.where(eq(attachments.userId, other.id))
			.limit(1);

		await syncNoteAttachments(privateNoteId, owner.id, `/uploads/${otherAttachment[0].id}.png`);
		const links = await db
			.select()
			.from(noteAttachments)
			.where(
				and(
					eq(noteAttachments.noteId, privateNoteId),
					eq(noteAttachments.attachmentId, otherAttachment[0].id)
				)
			);
		expect(links).toHaveLength(0);
	});
});

describe('GET /uploads/[path] のアクセス制御', () => {
	it('公開ノートの画像は未ログインでも取得できる', async () => {
		await syncNoteAttachments(publicNoteId, owner.id, `/uploads/${publicAttachmentId}.png`);
		mockGetSession.mockResolvedValue(null);

		const res = await callUploads(`${publicAttachmentId}.png`);
		expect(res.status).toBe(200);
		expect(res.headers.get('cache-control')).toContain('public');
		expect(res.headers.get('x-content-type-options')).toBe('nosniff');
	});

	it('非公開ノートの画像は未ログインだと404', async () => {
		await syncNoteAttachments(privateNoteId, owner.id, `/uploads/${privateAttachmentId}.png`);
		mockGetSession.mockResolvedValue(null);

		const res = await callUploads(`${privateAttachmentId}.png`);
		expect(res.status).toBe(404);
	});

	it('非公開ノートの画像でも所有者なら取得できる', async () => {
		mockGetSession.mockResolvedValue(ownerSession);

		const res = await callUploads(`${privateAttachmentId}.png`);
		expect(res.status).toBe(200);
		expect(res.headers.get('cache-control')).toContain('private');
	});

	it('DBに存在しないキーは404', async () => {
		mockGetSession.mockResolvedValue(ownerSession);

		const res = await callUploads(`${ulid()}.png`);
		expect(res.status).toBe(404);
	});
});
