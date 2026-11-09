import type { RequestHandler } from './$types';
import { and, asc, desc, eq, inArray, like, or, sql, type SQL } from 'drizzle-orm';
import { db, updateNoteLinks } from '$lib/server/db';
import { notes, tags, noteTags } from '$lib/server/db/schema';
import { ulid } from 'ulid';
import { getPrincipal, hasScope } from '$lib/server/api-auth';
import { apiJson, apiError, preflight } from '$lib/server/api-response';
import {
	NOTE_STATUSES,
	getTagsMap,
	isNoteStatus,
	toApiNote,
	toApiSummary
} from '$lib/server/api-notes';
import { generateSlug } from '$lib/utils/slug';

export const OPTIONS: RequestHandler = () => preflight();

const DEFAULT_STATUSES = NOTE_STATUSES.filter((s) => s !== 'box-deleted');

export const GET: RequestHandler = async ({ request, url }) => {
	const principal = await getPrincipal(request);
	if (!principal) return apiError(401, 'unauthorized', '認証が必要です');
	if (!hasScope(principal, 'read')) return apiError(403, 'insufficient_scope', 'readスコープが必要です');

	const statusParam = url.searchParams.get('status');
	let statuses: string[] = [...DEFAULT_STATUSES];
	if (statusParam) {
		statuses = statusParam
			.split(',')
			.map((s: string) => s.trim())
			.filter(Boolean);
		const invalid = statuses.filter((s: string) => !isNoteStatus(s));
		if (invalid.length > 0) {
			return apiError(400, 'invalid_status', `不正なstatusです: ${invalid.join(', ')}`);
		}
	}

	const q = (url.searchParams.get('q') ?? '').trim();
	const tag = (url.searchParams.get('tag') ?? '').trim();
	const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 1), 100);
	const offset = Math.max(Number.parseInt(url.searchParams.get('offset') ?? '0', 10) || 0, 0);
	const sortParam = url.searchParams.get('sort') ?? 'updated';
	const orderParam = url.searchParams.get('order') ?? 'desc';
	const includeContent = (url.searchParams.get('include') ?? '').split(',').includes('content');

	if (!['updated', 'created', 'title'].includes(sortParam)) {
		return apiError(400, 'invalid_sort', 'sortは updated / created / title のいずれかです');
	}
	if (!['asc', 'desc'].includes(orderParam)) {
		return apiError(400, 'invalid_order', 'orderは asc / desc のいずれかです');
	}

	const conditions: SQL[] = [eq(notes.userId, principal.userId)];
	conditions.push(inArray(notes.status, statuses));
	if (q) {
		conditions.push(or(like(notes.title, `%${q}%`), like(notes.content, `%${q}%`)) as SQL);
	}
	if (tag) {
		const taggedIds = db
			.select({ id: noteTags.noteId })
			.from(noteTags)
			.innerJoin(tags, eq(noteTags.tagId, tags.id))
			.where(eq(tags.name, tag));
		conditions.push(inArray(notes.id, taggedIds));
	}

	const where = and(...conditions);

	const sortColumn =
		sortParam === 'title' ? notes.title : sortParam === 'created' ? notes.createdAt : notes.updatedAt;
	const orderBy = orderParam === 'asc' ? asc(sortColumn) : desc(sortColumn);

	const [rows, countRow] = await Promise.all([
		db.select().from(notes).where(where).orderBy(orderBy).limit(limit).offset(offset),
		db.select({ count: sql<number>`COUNT(*)` }).from(notes).where(where)
	]);

	const tagMap = await getTagsMap(rows.map((r) => r.id));
	const list = rows.map((row) => {
		const names = tagMap.get(row.id) ?? [];
		return includeContent ? toApiNote(row, names) : toApiSummary(row, names);
	});

	return apiJson({
		notes: list,
		total: Number(countRow[0]?.count ?? 0),
		limit,
		offset
	});
};

type CreateBody = {
	title?: unknown;
	content?: unknown;
	status?: unknown;
	isPublic?: unknown;
	parentId?: unknown;
	tags?: unknown;
};

export const POST: RequestHandler = async ({ request }) => {
	const principal = await getPrincipal(request);
	if (!principal) return apiError(401, 'unauthorized', '認証が必要です');
	if (!hasScope(principal, 'write')) return apiError(403, 'insufficient_scope', 'writeスコープが必要です');

	let body: CreateBody;
	try {
		body = (await request.json()) as CreateBody;
	} catch {
		return apiError(400, 'invalid_json', 'JSONボディが必要です');
	}

	const title = typeof body.title === 'string' ? body.title.trim() : '';
	const content = typeof body.content === 'string' ? body.content : '';
	const status = body.status === undefined ? 'inbox' : body.status;
	if (!isNoteStatus(status)) {
		return apiError(400, 'invalid_status', `statusは ${NOTE_STATUSES.join(' / ')} のいずれかです`);
	}
	if (status === 'box' && !title) {
		return apiError(400, 'title_required', 'Boxノートにはタイトルが必要です');
	}

	const now = new Date();
	const noteId = ulid();
	const finalTitle = title || 'Untitled Note';
	const slug = title ? generateSlug(title) : noteId;

	if (status === 'box') {
		const dup = await db
			.select({ id: notes.id })
			.from(notes)
			.where(and(eq(notes.userId, principal.userId), eq(notes.status, 'box'), eq(notes.title, finalTitle)))
			.limit(1);
		if (dup.length > 0) {
			return apiError(409, 'title_conflict', `「${finalTitle}」というタイトルのノートが既に存在します`);
		}
	}

	let parentId: string | null = null;
	if (typeof body.parentId === 'string' && body.parentId) {
		const parent = await db
			.select({ id: notes.id })
			.from(notes)
			.where(and(eq(notes.id, body.parentId), eq(notes.userId, principal.userId)))
			.limit(1);
		if (parent.length === 0) return apiError(400, 'invalid_parent', '親ノートが見つかりません');
		parentId = parent[0].id;
	}

	const [created] = await db
		.insert(notes)
		.values({
			id: noteId,
			userId: principal.userId,
			title: finalTitle,
			slug,
			content,
			createdAt: now,
			updatedAt: now,
			isPublic: body.isPublic === true,
			parentId,
			status
		})
		.returning();

	// タグ（既存は使い回し、新規は作成）
	let tagNames: string[] = [];
	if (Array.isArray(body.tags)) {
		tagNames = [...new Set(body.tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean))];
		if (tagNames.length > 0) {
			const existing = await db.select().from(tags).where(inArray(tags.name, tagNames));
			const idByName = new Map(existing.map((t) => [t.name, t.id]));
			const newTags = tagNames
				.filter((name) => !idByName.has(name))
				.map((name) => ({ id: ulid(), name, userId: principal.userId, createdAt: now }));
			if (newTags.length > 0) {
				await db.insert(tags).values(newTags);
				newTags.forEach((t) => idByName.set(t.name, t.id));
			}
			await db.insert(noteTags).values(tagNames.map((name) => ({ noteId, tagId: idByName.get(name)! })));
		}
	}

	await updateNoteLinks(noteId, content, principal.userId, { isNew: true });

	// updateNoteLinks が resolvedLinks を書き戻すので、最新行を読み直して返す
	const [fresh] = await db
		.select()
		.from(notes)
		.where(and(eq(notes.id, noteId), eq(notes.userId, principal.userId)))
		.limit(1);

	return apiJson({ note: toApiNote(fresh ?? created, tagNames) }, { status: 201 });
};
