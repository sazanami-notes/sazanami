// src/routes/api/v1/import/+server.ts
// ノートの一括インポート（JSON）。export のJSONをそのまま流し込める形にする。
// Markdown/ZIPのインポートは Web UI（/settings/import）側の担当。
import type { RequestHandler } from './$types';
import { db, updateNoteLinks } from '$lib/server/db';
import { notes, tags, noteTags } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { getPrincipal, hasScope } from '$lib/server/api-auth';
import { apiError, apiJson, preflight } from '$lib/server/api-response';
import { isNoteStatus } from '$lib/server/api-notes';
import { generateSlug } from '$lib/utils/slug';

const MAX_NOTES = 500;

type ImportNote = {
	title?: unknown;
	content?: unknown;
	status?: unknown;
	tags?: unknown;
	createdAt?: unknown;
	updatedAt?: unknown;
};

function parseDate(value: unknown, fallback: Date): Date {
	if (typeof value !== 'string') return fallback;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export const OPTIONS: RequestHandler = () => preflight();

export const POST: RequestHandler = async ({ request }) => {
	const principal = await getPrincipal(request);
	if (!principal) return apiError(401, 'unauthorized', '認証が必要です');
	if (!hasScope(principal, 'write'))
		return apiError(403, 'insufficient_scope', 'writeスコープが必要です');

	let body: { notes?: unknown; skipExistingTitles?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return apiError(400, 'invalid_json', 'JSONボディが必要です');
	}

	if (!Array.isArray(body.notes) || body.notes.length === 0)
		return apiError(400, 'notes_required', 'notes 配列が必要です');
	if (body.notes.length > MAX_NOTES)
		return apiError(400, 'too_many_notes', `1回のインポートは${MAX_NOTES}件までです`);

	const skipExisting = body.skipExistingTitles !== false;

	const existingRows = await db
		.select({ title: notes.title })
		.from(notes)
		.where(eq(notes.userId, principal.userId));
	const existingTitles = new Set(existingRows.map((row) => row.title));

	let imported = 0;
	let skipped = 0;
	const errors: { index: number; message: string }[] = [];
	const created: { id: string; content: string }[] = [];

	for (const [index, raw] of (body.notes as ImportNote[]).entries()) {
		try {
			if (!raw || typeof raw !== 'object') throw new Error('ノートがオブジェクトではありません');

			const title = typeof raw.title === 'string' ? raw.title.trim() : '';
			const content = typeof raw.content === 'string' ? raw.content : '';
			if (!title && !content) throw new Error('title も content も空です');

			if (skipExisting && title && existingTitles.has(title)) {
				skipped++;
				continue;
			}

			const status = isNoteStatus(raw.status as string) ? (raw.status as string) : 'inbox';
			const now = new Date();
			const createdAt = parseDate(raw.createdAt, now);
			const updatedAt = parseDate(raw.updatedAt, createdAt);
			const id = ulid();

			await db.insert(notes).values({
				id,
				userId: principal.userId,
				title,
				slug: title ? generateSlug(title) : id,
				content,
				status,
				createdAt,
				updatedAt
			});

			const tagNames = Array.isArray(raw.tags)
				? [
						...new Set(
							raw.tags.filter((tag): tag is string => typeof tag === 'string' && !!tag.trim())
						)
					]
				: [];
			if (tagNames.length > 0) {
				const existingTags = await db.select().from(tags);
				const idByName = new Map(existingTags.map((tag) => [tag.name, tag.id]));
				const missing = tagNames.filter((name) => !idByName.has(name));
				if (missing.length > 0) {
					const rows = missing.map((name) => ({ id: ulid(), name, createdAt: now }));
					await db.insert(tags).values(rows);
					rows.forEach((row) => idByName.set(row.name, row.id));
				}
				await db
					.insert(noteTags)
					.values(tagNames.map((name) => ({ noteId: id, tagId: idByName.get(name)! })));
			}

			if (title) existingTitles.add(title);
			created.push({ id, content });
			imported++;
		} catch (error) {
			errors.push({ index, message: error instanceof Error ? error.message : String(error) });
		}
	}

	// リンク解決は全挿入後にまとめて（既存ノートへのリンクも張れる）
	for (const note of created) {
		try {
			await updateNoteLinks(note.id, note.content, principal.userId, { isNew: true });
		} catch (error) {
			console.error('Failed to resolve links on import:', note.id, error);
		}
	}

	return apiJson({ imported, skipped, failed: errors.length, errors });
};
