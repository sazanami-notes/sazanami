// エクスポート/インポートで使う整形ユーティリティ（API v1 と MCP で共用）。
import type { notes } from '$lib/server/db/schema';

export type NoteRow = typeof notes.$inferSelect;

export type ExportNote = {
	id: string;
	title: string;
	content: string;
	status: string;
	isPublic: boolean;
	isPinned: boolean;
	tags: string[];
	createdAt: string;
	updatedAt: string;
	parentId: string | null;
};

/** DB行をエクスポート用の素直なJSONへ */
export function toExportNote(row: NoteRow, tags: string[] = []): ExportNote {
	return {
		id: row.id,
		title: row.title ?? '',
		content: row.content ?? '',
		status: row.status,
		isPublic: row.isPublic,
		isPinned: row.isPinned,
		tags,
		createdAt: new Date(row.createdAt).toISOString(),
		updatedAt: new Date(row.updatedAt).toISOString(),
		parentId: row.parentId ?? null
	};
}

/** ファイル名に使えない文字を潰す（Obsidian Vault へ書き戻す想定） */
export function safeFileName(title: string, fallback: string): string {
	const base = (title || fallback)
		.replace(/[\\/:*?"<>|]/g, '_')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 120);
	return base || fallback;
}

function yamlString(value: string): string {
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Obsidian互換のMarkdown（frontmatter付き） */
export function toMarkdown(row: NoteRow, tags: string[] = []): string {
	const lines = ['---', `title: ${yamlString(row.title ?? '')}`];
	lines.push(`status: ${row.status}`);
	lines.push(`created: ${new Date(row.createdAt).toISOString()}`);
	lines.push(`modified: ${new Date(row.updatedAt).toISOString()}`);
	if (tags.length > 0) {
		lines.push('tags:');
		for (const tag of tags) lines.push(`  - ${yamlString(tag)}`);
	}
	lines.push('---', '', row.content ?? '');
	return lines.join('\n');
}
