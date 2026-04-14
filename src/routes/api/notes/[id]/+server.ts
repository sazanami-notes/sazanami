import { json, type RequestHandler } from '@sveltejs/kit';

import { db, updateNoteLinks, updateBacklinksOnTitleChange } from '$lib/server/db';
import { notes, tags, noteTags, timeline } from '$lib/server/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { ulid } from 'ulid';
import { auth } from '$lib/server/auth';
import { generateSlug } from '$lib/utils/slug'; // スラッグ生成ユーティリティをインポート

export const GET: RequestHandler = async ({ params, request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) {
		return new Response('Unauthorized', { status: 401 });
	}

	if (!params.id) {
		return new Response('Note ID is required', { status: 400 });
	}

	const noteId = params.id; // 型を固定するためにローカル変数に代入

	try {
		const note = await db
			.select()
			.from(notes)
			.where(and(eq(notes.id, noteId), eq(notes.userId, session.session.userId)))
			.limit(1);

		if (note.length === 0) {
			return new Response('Note not found', { status: 404 });
		}

		// タグを取得
		const noteTagsList = await db
			.select({ name: tags.name })
			.from(noteTags)
			.leftJoin(tags, eq(noteTags.tagId, tags.id))
			.where(eq(noteTags.noteId, noteId));

		let contentBinBase64: string | undefined;
		if (note[0].contentBin) {
			try {
				contentBinBase64 = Buffer.from(note[0].contentBin).toString('base64');
			} catch(e) {}
		}

		let contentBinBase64: string | undefined;
		if (note[0].contentBin) {
			try {
				contentBinBase64 = Buffer.from(note[0].contentBin).toString('base64');
			} catch(e) {}
		}

		const noteWithTags = {
			...note[0],
			contentBin: contentBinBase64,
			contentBin: contentBinBase64,
			tags: noteTagsList.map((nt) => nt.name).filter(Boolean)
		};

		return json(noteWithTags);
	} catch (error) {
		console.error('Error fetching note:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) {
		return new Response('Unauthorized', { status: 401 });
	}

	if (!params.id) {
		return new Response('Note ID is required', { status: 400 });
	}

	const noteId = params.id; // 型を固定するためにローカル変数に代入

	try {
		const body = await request.json();
		if (typeof body !== 'object' || body === null) {
			return new Response('Invalid request body', { status: 400 });
		}
		const {
			title,
			contentHtml,
			contentBin,
			tags: tagNames
		} = body as { title?: string; contentHtml?: string; contentBin?: string; tags?: string[] };

		// ノートが存在するか確認
		const existingNote = await db
			.select()
			.from(notes)
			.where(and(eq(notes.id, noteId), eq(notes.userId, session.session.userId)))
			.limit(1);

		if (existingNote.length === 0) {
			return new Response('Note not found', { status: 404 });
		}

		const now = new Date();
		const titleChanged = title !== undefined && title !== existingNote[0].title;
		const contentHtmlChanged = contentHtml !== undefined && contentHtml !== existingNote[0].contentHtml;
		const contentBinChanged = contentBin !== undefined;
		const tagsProvided = Array.isArray(tagNames);

		const updatedFields: Record<string, unknown> = {};
		const metadata: {
			changes: Record<string, unknown>;
		} = {
			changes: {}
		};

		if (titleChanged) {
			updatedFields.title = title;
			updatedFields.slug = generateSlug(title);
			metadata.changes.title = { before: existingNote[0].title, after: title };
		}
		if (contentHtmlChanged) {
			updatedFields.contentHtml = contentHtml;
			// metadata.changes.contentHtml = true;
		}
		if (contentBinChanged) {
			try {
				updatedFields.contentBin = Buffer.from(contentBin!, 'base64');
				metadata.changes.contentBin = true;
			} catch(e) {
				console.error('Failed to parse contentBin base64', e);
			}
		}
		if (contentHtmlChanged) {
			// updatedFields.contentHtml = contentHtml; handled above
			// metadata.changes.contentHtml = true; // コンテンツの変更は差分ではなく変更があったことだけ記録
		}

		if (titleChanged || contentHtmlChanged || contentBinChanged) {
			updatedFields.updatedAt = now;
		}

		// Boxノートのタイトル変更時に一意性チェック
		if (titleChanged && existingNote[0].status === 'box' && title.trim() !== '') {
			const duplicate = await db
				.select({ id: notes.id })
				.from(notes)
				.where(
					and(
						eq(notes.userId, session.session.userId),
						eq(notes.status, 'box'),
						eq(notes.title, title.trim()),
						ne(notes.id, noteId) // 自分自身は除外
					)
				)
				.limit(1);
			if (duplicate.length > 0) {
				return json(
					{ message: `「${title.trim()}」というタイトルのノートが既に存在します` },
					{ status: 409 }
				);
			}
		}

		if (!titleChanged && !contentHtmlChanged && !contentBinChanged && !tagsProvided) {
			const noteTagsList = await db
				.select({ name: tags.name })
				.from(noteTags)
				.leftJoin(tags, eq(noteTags.tagId, tags.id))
				.where(eq(noteTags.noteId, noteId));

			return json({
				...existingNote[0],
				tags: noteTagsList.map((nt) => nt.name).filter(Boolean),
				resolvedLinks: existingNote[0].resolvedLinks
			});
		}

		// ノートを更新
		if (Object.keys(updatedFields).length > 0) {
			await db
				.update(notes)
				.set(updatedFields)
				.where(and(eq(notes.id, noteId), eq(notes.userId, session.session.userId)));
		}

		// タイムラインイベントを記録
		if (Object.keys(metadata.changes).length > 0) {
			await db.insert(timeline).values({
				userId: session.session.userId,
				noteId: noteId,
				type: 'note_updated',
				createdAt: now,
				metadata: JSON.stringify(metadata)
			});
		}

		// タグの変更を検知してタイムラインに記録
		let tagsChanged = false;
		if (tagsProvided) {
			const oldTagsResult = await db
				.select({ name: tags.name })
				.from(noteTags)
				.leftJoin(tags, eq(noteTags.tagId, tags.id))
				.where(eq(noteTags.noteId, noteId));
			const oldTagNames = new Set(oldTagsResult.map((t) => t.name).filter(Boolean) as string[]);
			const newTagNames = new Set(tagNames.map((t) => t.trim()).filter(Boolean));

			const addedTags = [...newTagNames].filter((t) => !oldTagNames.has(t));
			const removedTags = [...oldTagNames].filter((t) => !newTagNames.has(t));
			tagsChanged = addedTags.length > 0 || removedTags.length > 0;

			if (tagsChanged) {
				await db.insert(timeline).values({
					userId: session.session.userId,
					noteId: noteId,
					type: 'note_tags_updated',
					createdAt: now,
					metadata: JSON.stringify({
						added: addedTags,
						removed: removedTags
					})
				});
			}

			if (tagsChanged) {
				await db
					.update(notes)
					.set({ updatedAt: now })
					.where(and(eq(notes.id, noteId), eq(notes.userId, session.session.userId)));
			}

			// 既存のタグをクリア
			await db.delete(noteTags).where(eq(noteTags.noteId, noteId));

			// 新しいタグを設定
			if (tagNames.length > 0) {
				for (const tagName of tagNames) {
					if (!tagName || !tagName.trim()) continue;

					const trimmedTagName = tagName.trim();

					// タグが存在するか確認
					const existingTag = await db.select().from(tags).where(eq(tags.name, trimmedTagName));

					let tagId: string;

					if (existingTag.length === 0) {
						// 新規タグを作成
						tagId = ulid();
						await db.insert(tags).values({
							id: tagId,
							name: trimmedTagName,
							createdAt: now
						});
					} else {
						tagId = existingTag[0].id;
					}

					// ノートとタグの関連付け
					await db.insert(noteTags).values({
						noteId,
						tagId
					});
				}
			}
		}

		// After updating the note, update its links
		if (contentHtmlChanged) {
			updatedFields.contentHtml = contentHtml;
			// metadata.changes.contentHtml = true;
		}
		if (contentBinChanged) {
			try {
				updatedFields.contentBin = Buffer.from(contentBin!, 'base64');
				metadata.changes.contentBin = true;
			} catch(e) {
				console.error('Failed to parse contentBin base64', e);
			}
		}
		if (contentHtmlChanged) {
			const finalContent = contentHtml !== undefined ? contentHtml : existingNote[0].contentHtml;
			await updateNoteLinks(noteId, finalContent || '', session.session.userId);
		}

		// タイトルが変更された場合、他のノートからのWikiLink（バックリンク）を更新
		if (titleChanged && existingNote[0].title) {
			await updateBacklinksOnTitleChange(noteId, existingNote[0].title, title, session.session.userId);
		}

		const updatedNote = await db
			.select()
			.from(notes)
			.where(and(eq(notes.id, noteId), eq(notes.userId, session.session.userId)))
			.limit(1);

		// タグを取得
		const noteTagsList = await db
			.select({ name: tags.name })
			.from(noteTags)
			.leftJoin(tags, eq(noteTags.tagId, tags.id))
			.where(eq(noteTags.noteId, noteId));

		let contentBinBase64: string | undefined;
		if (updatedNote[0].contentBin) {
			try {
				contentBinBase64 = Buffer.from(updatedNote[0].contentBin).toString('base64');
			} catch(e) {}
		}

		const noteWithTags = {
			...updatedNote[0],
			contentBin: contentBinBase64,
			tags: noteTagsList.map((nt) => nt.name).filter(Boolean),
			resolvedLinks: updatedNote[0].resolvedLinks // ここで明示的に含める（select * なので本来含まれるが確認用）
		};

		return json(noteWithTags);
	} catch (error) {
		console.error('Error updating note:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) {
		return new Response('Unauthorized', { status: 401 });
	}

	if (!params.id) {
		return new Response('Note ID is required', { status: 400 });
	}

	const noteId = params.id; // 型を固定するためにローカル変数に代入

	try {
		// ノートが存在するか確認
		const existingNote = await db
			.select()
			.from(notes)
			.where(and(eq(notes.id, noteId), eq(notes.userId, session.session.userId)))
			.limit(1);

		if (existingNote.length === 0) {
			return new Response('Note not found', { status: 404 });
		}

		// 関連するタグの関連付けを削除
		await db.delete(noteTags).where(eq(noteTags.noteId, noteId));

		// タイムラインイベントを記録 (ノート削除前に)
		await db.insert(timeline).values({
			userId: session.session.userId,
			noteId: noteId,
			type: 'note_deleted',
			createdAt: new Date(),
			metadata: JSON.stringify({ title: existingNote[0].title })
		});

		// ノートを削除
		await db
			.delete(notes)
			.where(and(eq(notes.id, noteId), eq(notes.userId, session.session.userId)));

		return new Response(null, { status: 204 });
	} catch (error) {
		console.error('Error deleting note:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
};
