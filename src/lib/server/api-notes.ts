// src/lib/server/api-notes.ts
// API v1 のノート表現（契約は docs/api-v1.md）。
// DBの行をそのまま返さず、日時をISO文字列に・resolvedLinksをオブジェクトに・タグを配列に整える。
import { db } from '$lib/server/db';
import { notes, tags, noteTags } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';

export type ApiNoteRow = typeof notes.$inferSelect;

export const NOTE_STATUSES = [
	'inbox',
	'box',
	'archived',
	'trash',
	'box-archived',
	'box-deleted'
] as const;

export type NoteStatus = (typeof NOTE_STATUSES)[number];

export function isNoteStatus(value: unknown): value is NoteStatus {
	return typeof value === 'string' && (NOTE_STATUSES as readonly string[]).includes(value);
}

/** ノートIDの配列からタグ名のMapを作る（N+1を避ける） */
export async function getTagsMap(noteIds: string[]): Promise<Map<string, string[]>> {
	const map = new Map<string, string[]>();
	if (noteIds.length === 0) return map;

	const rows = await db
		.select({ noteId: noteTags.noteId, name: tags.name })
		.from(noteTags)
		.innerJoin(tags, eq(noteTags.tagId, tags.id))
		.where(inArray(noteTags.noteId, noteIds));

	for (const row of rows) {
		const list = map.get(row.noteId) ?? [];
		list.push(row.name);
		map.set(row.noteId, list);
	}
	return map;
}

function parseResolvedLinks(raw: string | null): Record<string, string> | null {
	if (!raw) return null;
	try {
		return JSON.parse(raw) as Record<string, string>;
	} catch {
		return null;
	}
}

export function makeExcerpt(content: string | null, length = 200): string {
	if (!content) return '';
	const plain = content
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		.replace(/\[\[([^\]]+)\]\]/g, '$1')
		.replace(/[#>*_`~]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	return plain.length > length ? `${plain.slice(0, length)}…` : plain;
}

/** 完全形（content込み） */
export function toApiNote(row: ApiNoteRow, tagNames: string[]) {
	return {
		id: row.id,
		title: row.title,
		slug: row.slug,
		content: row.content ?? '',
		status: row.status,
		isPublic: Boolean(row.isPublic),
		isPinned: Boolean(row.isPinned),
		parentId: row.parentId ?? null,
		context: row.context ?? null,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		resolvedLinks: parseResolvedLinks(row.resolvedLinks),
		tags: tagNames
	};
}

/** 一覧用（contentを除きexcerptを足す） */
export function toApiSummary(row: ApiNoteRow, tagNames: string[]) {
	const note = toApiNote(row, tagNames);
	const { content, context: _context, ...rest } = note;
	return { ...rest, excerpt: makeExcerpt(content) };
}
