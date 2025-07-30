import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notes, tags, noteTags } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
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

		const noteWithTags = {
			...note[0],
			tags: noteTagsList.map(nt => nt.name).filter(Boolean)
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
		const { title, content, tags: tagNames } = body as { title?: string; content?: string; tags?: string[] };

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
        const updatedTitle = title !== undefined ? title : existingNote[0].title;
        const updatedSlug = generateSlug(updatedTitle); // スラッグを再生成

		// ノートを更新
		await db
			.update(notes)
			.set({
				title: updatedTitle,
                slug: updatedSlug, // スラッグを更新
				content: content !== undefined ? content : existingNote[0].content,
				updatedAt: now
			})
			.where(and(eq(notes.id, noteId), eq(notes.userId, session.session.userId)));

		// 既存のタグをクリア
		await db.delete(noteTags).where(eq(noteTags.noteId, noteId));

		// 新しいタグを設定
		if (tagNames && Array.isArray(tagNames) && tagNames.length > 0) {
			for (const tagName of tagNames) {
				if (!tagName || !tagName.trim()) continue;

				const trimmedTagName = tagName.trim();
				
				// タグが存在するか確認
				const existingTag = await db
					.select()
					.from(tags)
					.where(eq(tags.name, trimmedTagName));

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

		const noteWithTags = {
			...updatedNote[0],
			tags: noteTagsList.map(nt => nt.name).filter(Boolean)
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

		// ノートを削除
		await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.userId, session.session.userId)));

		return new Response(null, { status: 204 });
	} catch (error) {
		console.error('Error deleting note:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
};