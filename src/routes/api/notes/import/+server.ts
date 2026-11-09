import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, updateNoteLinks } from '$lib/server/db';
import { notes, tags, noteTags } from '$lib/server/db/schema';
import { getSessionCached } from '$lib/server/auth-session';
import { ulid } from 'ulid';
import { generateSlug } from '$lib/utils/slug';
import JSZip from 'jszip';
import { eq } from 'drizzle-orm';

/**
 * Frontmatter（--- で囲まれたブロック）をパースして本文と分離する。
 * 対応キー: modified（日時）, tags（リスト or フロー形式）
 */
function parseFrontmatter(raw: string): {
	body: string;
	meta: Record<string, string | string[]>;
} {
	if (!raw.startsWith('---')) return { body: raw, meta: {} };
	const endIdx = raw.indexOf('\n---', 3);
	if (endIdx === -1) return { body: raw, meta: {} };

	const fmText = raw.slice(3, endIdx).trim();
	const body = raw.slice(endIdx + 4).replace(/^\n+/, '');
	const meta: Record<string, string | string[]> = {};
	let currentKey: string | null = null;
	let currentList: string[] = [];

	for (const line of fmText.split('\n')) {
		const listMatch = line.match(/^\s+-\s+(.*)$/);
		if (listMatch && currentKey) {
			currentList.push(listMatch[1].trim().replace(/^["']|["']$/g, ''));
			continue;
		}
		const kvMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
		if (kvMatch) {
			if (currentKey && currentList.length > 0) meta[currentKey] = currentList;
			currentKey = kvMatch[1];
			currentList = [];
			const value = kvMatch[2].trim();
			if (value) {
				const flow = value.match(/^\[(.*)\]$/);
				if (flow) {
					meta[currentKey] = flow[1]
						.split(',')
						.map((s) => s.trim().replace(/^["']|["']$/g, ''))
						.filter(Boolean);
				} else {
					meta[currentKey] = value.replace(/^["']|["']$/g, '');
				}
			}
		}
	}
	if (currentKey && currentList.length > 0) meta[currentKey] = currentList;
	return { body, meta };
}

/** タグ名の配列をノートに付与する（存在しないタグは作成） */
async function attachTags(noteId: string, tagNames: string[], now: Date) {
	for (const raw of tagNames) {
		const name = raw.trim().replace(/^#/, '');
		if (!name) continue;
		const existing = await db.select().from(tags).where(eq(tags.name, name));
		let tagId: string;
		if (existing.length === 0) {
			tagId = ulid();
			await db.insert(tags).values({ id: tagId, name, createdAt: now });
		} else {
			tagId = existing[0].id;
		}
		await db.insert(noteTags).values({ noteId, tagId });
	}
}

/** ZIPファイルからMarkdownファイルを再帰的に抽出する */
async function extractMarkdownFromZip(zipFile: File): Promise<{ name: string; content: string }[]> {
	const buffer = await zipFile.arrayBuffer();
	const zip = await JSZip.loadAsync(buffer);

	const results: { name: string; content: string }[] = [];
	const promises: Promise<void>[] = [];

	zip.forEach((relativePath, zipEntry) => {
		// ディレクトリ・macOSメタデータ・隠しファイル・非Markdownはスキップ
		if (
			zipEntry.dir ||
			relativePath.startsWith('__MACOSX/') ||
			(relativePath.split('/').pop() ?? '').startsWith('.') ||
			!relativePath.toLowerCase().endsWith('.md')
		) {
			return;
		}

		// ディレクトリ構造を無視してファイル名のみ使用
		const fileName = relativePath.split('/').pop() ?? relativePath;

		const p = zipEntry.async('string').then((content) => {
			results.push({ name: fileName, content });
		});

		promises.push(p);
	});

	await Promise.all(promises);
	return results;
}

export const POST: RequestHandler = async ({ request }) => {
	const session = await getSessionCached(request.headers);
	if (!session?.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}
	const userId = session.user.id;

	try {
		const formData = await request.formData();
		const files = formData.getAll('files') as File[];

		if (files.length === 0) {
			return json({ message: 'No files uploaded' }, { status: 400 });
		}

		let skippedCount = 0;
		const errors: string[] = [];
		const markdownFiles: { name: string; content: string }[] = [];

		for (const file of files) {
			const lowerName = file.name.toLowerCase();
			const isZip =
				file.type === 'application/zip' ||
				file.type === 'application/x-zip-compressed' ||
				lowerName.endsWith('.zip');
			const isMd = file.type === 'text/markdown' || lowerName.endsWith('.md');

			if (isZip) {
				try {
					const extracted = await extractMarkdownFromZip(file);
					markdownFiles.push(...extracted);
				} catch (e) {
					console.error(`Failed to extract ZIP: ${file.name}`, e);
					errors.push(`ZIPの展開に失敗: ${file.name}`);
				}
			} else if (isMd) {
				const content = await file.text();
				markdownFiles.push({ name: file.name, content });
			} else {
				console.warn(`Skipping unsupported file: ${file.name}`);
				skippedCount++;
			}
		}

		// 既存タイトル一覧（重複スキップ用）
		const existingRows = await db
			.select({ title: notes.title })
			.from(notes)
			.where(eq(notes.userId, userId));
		const existingTitles = new Set(existingRows.map((r) => r.title));

		// パス1: ノートを挿入（リンク更新は全挿入後にまとめて）
		const inserted: { id: string; content: string; tagNames: string[] }[] = [];
		let importedCount = 0;

		for (const { name, content } of markdownFiles) {
			try {
				const dotIdx = name.lastIndexOf('.');
				const rawTitle = dotIdx >= 0 ? name.slice(0, dotIdx) : name;
				const title = rawTitle.trim();
				if (!title) {
					skippedCount++;
					continue;
				}
				if (existingTitles.has(title)) {
					skippedCount++;
					continue;
				}

				const { body, meta } = parseFrontmatter(content);

				// modified を日時に反映
				let noteDate = new Date();
				const modified = meta['modified'];
				if (typeof modified === 'string') {
					const parsed = new Date(modified);
					if (!isNaN(parsed.getTime())) noteDate = parsed;
				}

				// タグ収集（リスト形式 or フロー形式 or カンマ区切り）
				let tagNames: string[] = [];
				const tagsMeta = meta['tags'];
				if (Array.isArray(tagsMeta)) {
					tagNames = tagsMeta;
				} else if (typeof tagsMeta === 'string' && tagsMeta.trim()) {
					tagNames = tagsMeta.split(',').map((s) => s.trim());
				}

				const noteId = ulid();
				const slug = generateSlug(title) || noteId;

				await db.insert(notes).values({
					id: noteId,
					userId,
					title,
					slug,
					content: body,
					status: 'box',
					isPublic: false,
					isPinned: false,
					createdAt: noteDate,
					updatedAt: noteDate
				});

				existingTitles.add(title);
				inserted.push({ id: noteId, content: body, tagNames });
				importedCount++;
			} catch (e) {
				console.error(`Failed to import file: ${name}`, e);
				errors.push(`インポート失敗: ${name}`);
			}
		}

		// パス2: リンクを更新（全ノート挿入後なので相互リンクも解決される）
		for (const { id, content } of inserted) {
			try {
				await updateNoteLinks(id, content, userId);
			} catch (e) {
				console.error(`Failed to update links for note ${id}`, e);
			}
		}

		// タグ付与
		const now = new Date();
		for (const { id, tagNames } of inserted) {
			if (tagNames.length > 0) {
				try {
					await attachTags(id, tagNames, now);
				} catch (e) {
					console.error(`Failed to attach tags for note ${id}`, e);
				}
			}
		}

		return json(
			{
				success: true,
				importedCount,
				skippedCount,
				errors
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error handling file import:', error);
		return json({ message: 'Internal Server Error' }, { status: 500 });
	}
};
