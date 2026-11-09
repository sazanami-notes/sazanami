// src/routes/api/v1/export/+server.ts
// 全ノートのエクスポート。format=json（既定）はJSON、format=md はMarkdownのZIP。
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { notes } from '$lib/server/db/schema';
import { and, asc, eq, gt, type SQL } from 'drizzle-orm';
import JSZip from 'jszip';
import { getPrincipal, hasScope } from '$lib/server/api-auth';
import { apiError, apiJson, CORS_HEADERS, preflight } from '$lib/server/api-response';
import { getTagsMap } from '$lib/server/api-notes';
import { safeFileName, toExportNote, toMarkdown } from '$lib/server/note-export';

const MAX_NOTES = 20000;

function parseIntParam(raw: string | null, fallback: number, max: number): number {
	const parsed = Number.parseInt(raw ?? '', 10);
	if (!Number.isFinite(parsed) || parsed < 1) return fallback;
	return Math.min(parsed, max);
}

export const OPTIONS: RequestHandler = () => preflight();

export const GET: RequestHandler = async ({ url, request }) => {
	const principal = await getPrincipal(request);
	if (!principal) return apiError(401, 'unauthorized', '認証が必要です');
	if (!hasScope(principal, 'read'))
		return apiError(403, 'insufficient_scope', 'readスコープが必要です');

	const format = url.searchParams.get('format') === 'md' ? 'md' : 'json';
	const limit = parseIntParam(url.searchParams.get('limit'), 5000, MAX_NOTES);
	const cursor = url.searchParams.get('cursor');

	const conditions: SQL[] = [eq(notes.userId, principal.userId)];
	if (cursor) conditions.push(gt(notes.id, cursor));

	const rows = await db
		.select()
		.from(notes)
		.where(and(...conditions))
		.orderBy(asc(notes.id))
		.limit(limit);

	const tagsMap = await getTagsMap(rows.map((row) => row.id));
	const tagsOf = (id: string) => tagsMap.get(id) ?? [];

	if (format === 'md') {
		const zip = new JSZip();
		const used = new Set<string>();
		for (const row of rows) {
			let name = safeFileName(row.title, row.id);
			if (used.has(name)) name = `${name}-${row.id.slice(-4)}`;
			used.add(name);
			zip.file(`${name}.md`, toMarkdown(row, tagsOf(row.id)));
		}
		const data = await zip.generateAsync({ type: 'arraybuffer' });
		return new Response(data, {
			headers: {
				...CORS_HEADERS,
				'content-type': 'application/zip',
				'content-disposition': `attachment; filename="sazanami-${new Date().toISOString().slice(0, 10)}.zip"`
			}
		});
	}

	return apiJson({
		version: 1,
		exportedAt: new Date().toISOString(),
		count: rows.length,
		nextCursor: rows.length === limit ? rows[rows.length - 1].id : null,
		notes: rows.map((row) => toExportNote(row, tagsOf(row.id)))
	});
};
