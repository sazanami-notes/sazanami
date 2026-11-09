import type { RequestHandler } from './$types';
import { and, eq, ne } from 'drizzle-orm';
import { db, deleteNote, updateBacklinksOnTitleChange, updateNoteLinks } from '$lib/server/db';
import { scheduleNoteEmbedding } from '$lib/server/embeddings';
import { notes } from '$lib/server/db/schema';
import { getPrincipal, hasScope } from '$lib/server/api-auth';
import { syncNoteAttachments } from '$lib/server/note-attachments';
import { apiJson, apiError, preflight } from '$lib/server/api-response';
import { NOTE_STATUSES, getTagsMap, isNoteStatus, toApiNote } from '$lib/server/api-notes';
import { generateSlug } from '$lib/utils/slug';

export const OPTIONS: RequestHandler = () => preflight();

async function loadNote(userId: string, id: string) {
	const rows = await db
		.select()
		.from(notes)
		.where(and(eq(notes.id, id), eq(notes.userId, userId)))
		.limit(1);
	return rows[0] ?? null;
}

export const GET: RequestHandler = async ({ request, params }) => {
	const principal = await getPrincipal(request);
	if (!principal) return apiError(401, 'unauthorized', '認証が必要です');
	if (!hasScope(principal, 'read'))
		return apiError(403, 'insufficient_scope', 'readスコープが必要です');

	const row = await loadNote(principal.userId, params.id as string);
	if (!row) return apiError(404, 'not_found', 'ノートが見つかりません');

	const tagMap = await getTagsMap([row.id]);
	return apiJson({ note: toApiNote(row, tagMap.get(row.id) ?? []) });
};

type UpdateBody = {
	title?: unknown;
	content?: unknown;
	status?: unknown;
	isPublic?: unknown;
	isPinned?: unknown;
	context?: unknown;
};

export const PUT: RequestHandler = async ({ request, params, platform }) => {
	const principal = await getPrincipal(request);
	if (!principal) return apiError(401, 'unauthorized', '認証が必要です');
	if (!hasScope(principal, 'write'))
		return apiError(403, 'insufficient_scope', 'writeスコープが必要です');

	const noteId = params.id as string;
	const existing = await loadNote(principal.userId, noteId);
	if (!existing) return apiError(404, 'not_found', 'ノートが見つかりません');

	let body: UpdateBody;
	try {
		body = (await request.json()) as UpdateBody;
	} catch {
		return apiError(400, 'invalid_json', 'JSONボディが必要です');
	}

	const now = new Date();
	const updatedFields: Record<string, unknown> = {};

	const titleChanged = typeof body.title === 'string' && body.title.trim() !== existing.title;
	const contentChanged =
		typeof body.content === 'string' && body.content !== (existing.content ?? '');
	const isPublicChanged =
		typeof body.isPublic === 'boolean' && body.isPublic !== Boolean(existing.isPublic);
	const isPinnedChanged =
		typeof body.isPinned === 'boolean' && body.isPinned !== Boolean(existing.isPinned);
	const contextChanged =
		body.context === null
			? existing.context !== null
			: typeof body.context === 'string' && body.context !== (existing.context ?? null);

	let nextStatus = existing.status;
	if (body.status !== undefined) {
		if (!isNoteStatus(body.status)) {
			return apiError(
				400,
				'invalid_status',
				`statusは ${NOTE_STATUSES.join(' / ')} のいずれかです`
			);
		}
		nextStatus = body.status;
	}
	const statusChanged = nextStatus !== existing.status;

	const nextTitle = titleChanged ? (body.title as string).trim() : existing.title;

	if (titleChanged && !nextTitle) {
		return apiError(400, 'title_required', 'タイトルを空にはできません');
	}

	// Boxノートのタイトル一意性（変更後の状態で判定）
	if (nextStatus === 'box' && (titleChanged || statusChanged) && nextTitle) {
		const dup = await db
			.select({ id: notes.id })
			.from(notes)
			.where(
				and(
					eq(notes.userId, principal.userId),
					eq(notes.status, 'box'),
					eq(notes.title, nextTitle),
					ne(notes.id, noteId)
				)
			)
			.limit(1);
		if (dup.length > 0) {
			return apiError(
				409,
				'title_conflict',
				`「${nextTitle}」というタイトルのノートが既に存在します`
			);
		}
	}

	if (titleChanged) {
		updatedFields.title = nextTitle;
		updatedFields.slug = generateSlug(nextTitle);
	}
	if (contentChanged) updatedFields.content = body.content;
	if (statusChanged) updatedFields.status = nextStatus;
	if (isPublicChanged) updatedFields.isPublic = body.isPublic;
	if (isPinnedChanged) updatedFields.isPinned = body.isPinned;
	if (contextChanged) updatedFields.context = body.context;

	const changed = Object.keys(updatedFields).length > 0;
	if (changed) {
		updatedFields.updatedAt = now;
		await db
			.update(notes)
			.set(updatedFields)
			.where(and(eq(notes.id, noteId), eq(notes.userId, principal.userId)));

		if (titleChanged) {
			await updateBacklinksOnTitleChange(noteId, existing.title, nextTitle, principal.userId);
		}
		if (titleChanged || contentChanged) {
			const nextContent =
				typeof body.content === 'string' ? body.content : (existing.content ?? '');
			await updateNoteLinks(noteId, nextContent, principal.userId);
			if (contentChanged) {
				await syncNoteAttachments(noteId, principal.userId, nextContent);
			}
		}
	}

	const fresh = await loadNote(principal.userId, noteId);
	const tagMap = await getTagsMap([noteId]);
	scheduleNoteEmbedding(platform, fresh ?? existing);
	return apiJson({ note: toApiNote(fresh ?? existing, tagMap.get(noteId) ?? []) });
};

export const DELETE: RequestHandler = async ({ request, params, url }) => {
	const principal = await getPrincipal(request);
	if (!principal) return apiError(401, 'unauthorized', '認証が必要です');
	if (!hasScope(principal, 'write'))
		return apiError(403, 'insufficient_scope', 'writeスコープが必要です');

	const noteId = params.id as string;
	const existing = await loadNote(principal.userId, noteId);
	if (!existing) return apiError(404, 'not_found', 'ノートが見つかりません');

	const permanent = url.searchParams.get('permanent') === 'true';

	if (permanent) {
		await deleteNote(noteId, principal.userId);
		return apiJson({ id: noteId, deleted: true, permanent: true });
	}

	await db
		.update(notes)
		.set({ status: 'trash', updatedAt: new Date() })
		.where(and(eq(notes.id, noteId), eq(notes.userId, principal.userId)));

	return apiJson({ id: noteId, deleted: true, permanent: false });
};
