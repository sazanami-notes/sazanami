import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, updateNoteLinks } from '$lib/server/db';
import { notes } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';
import { ulid } from 'ulid';
import { generateSlug } from '$lib/utils/slug';
import path from 'path';
import JSZip from 'jszip';

/**
 * ZIPファイルからMarkdownファイルを再帰的に抽出する
 */
async function extractMarkdownFromZip(
	zipFile: File
): Promise<{ name: string; content: string }[]> {
	const buffer = await zipFile.arrayBuffer();
	const zip = await JSZip.loadAsync(buffer);

	const results: { name: string; content: string }[] = [];
	const promises: Promise<void>[] = [];

	zip.forEach((relativePath, zipEntry) => {
		// ディレクトリ・macOSメタデータ・隠しファイル・非Markdownはスキップ
		if (
			zipEntry.dir ||
			relativePath.startsWith('__MACOSX/') ||
			path.basename(relativePath).startsWith('.') ||
			!relativePath.toLowerCase().endsWith('.md')
		) {
			return;
		}

		// ディレクトリ構造を無視してファイル名のみ使用
		const fileName = path.basename(relativePath);

		const p = zipEntry.async('string').then((content) => {
			results.push({ name: fileName, content });
		});

		promises.push(p);
	});

	await Promise.all(promises);
	return results;
}

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
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

		let importedCount = 0;
		let skippedCount = 0;
		const errors: string[] = [];

		// Markdownファイルをまとめるリスト
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

		// 各Markdownファイルを BOX ノートとして保存
		for (const { name, content } of markdownFiles) {
			try {
				const title = path.basename(name, path.extname(name));
				const noteId = ulid();
				const now = new Date();
				const slug = generateSlug(title) || noteId;

				await db.insert(notes).values({
					id: noteId,
					userId,
					title,
					slug,
					content,
					status: 'box',
					isPublic: false,
					isPinned: false,
					createdAt: now,
					updatedAt: now
				});

				await updateNoteLinks(noteId, content, userId);

				importedCount++;
			} catch (e) {
				console.error(`Failed to import file: ${name}`, e);
				errors.push(`インポート失敗: ${name}`);
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
