import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db, updateNoteLinks } from '$lib/server/db';
import { notes, tags, noteTags, timeline } from '$lib/server/db/schema';
import { eq, or, like, desc, sql, and } from 'drizzle-orm';
import { ulid } from 'ulid';
import { auth } from '$lib/server/auth';
import { generateSlug } from '$lib/utils/slug'; // スラッグ生成ユーティリティをインポート

export const GET: RequestHandler = async ({ url, request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	console.log('Session in GET:', session);
	if (!session) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const search = url.searchParams.get('search') || '';
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '20');
	const offset = (page - 1) * limit;

	try {
		let notesList;

		if (search) {
			notesList = await db
				.select()
				.from(notes)
				.where(
					and(
						eq(notes.userId, session.session.userId),
						or(like(notes.title, `%${search}%`), like(notes.content, `%${search}%`))
					)
				)
				.orderBy(desc(notes.updatedAt))
				.limit(limit)
				.offset(offset);
		} else {
			notesList = await db
				.select()
				.from(notes)
				.where(eq(notes.userId, session.session.userId))
				.orderBy(desc(notes.updatedAt))
				.limit(limit)
				.offset(offset);
		}

		// 各ノートのタグを取得
		const notesWithTags = await Promise.all(
			notesList.map(async (note) => {
				const noteTagsList = await db
					.select({ name: tags.name })
					.from(noteTags)
					.leftJoin(tags, eq(noteTags.tagId, tags.id))
					.where(eq(noteTags.noteId, note.id));

				return {
					...note,
					tags: noteTagsList.map((nt) => nt.name).filter(Boolean)
				};
			})
		);

		// 総数を取得
		let totalCount;
		if (search) {
			totalCount = await db
				.select({ count: sql<number>`COUNT(*)` })
				.from(notes)
				.where(
					and(
						eq(notes.userId, session.session.userId),
						or(like(notes.title, `%${search}%`), like(notes.content, `%${search}%`))
					)
				);
		} else {
			totalCount = await db
				.select({ count: sql<number>`COUNT(*)` })
				.from(notes)
				.where(eq(notes.userId, session.session.userId));
		}

		return json({
			notes: notesWithTags,
			pagination: {
				page,
				limit,
				total: totalCount[0].count,
				totalPages: Math.ceil(totalCount[0].count / limit)
			}
		});
	} catch (error) {
		console.error('Error fetching notes:', error);
		return json({ message: 'Internal Server Error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) {
		return json({ message: 'Unauthorized - No session found' }, { status: 401 });
	}

	try {
		let body;
		try {
			body = await request.json();
		} catch (parseError) {
			console.error('JSON parse error:', parseError);
			return json({ message: 'Invalid JSON format' }, { status: 400 });
		}

		// [デバッグ用ログ] 受信したリクエストボディを確認
		console.log('Received request to create note with body:', body);

		if (typeof body !== 'object' || body === null) {
			return json({ message: 'Invalid request body' }, { status: 400 });
		}
		const {
			id,
			title,
			content,
			tags: tagNames
		} = body as { id?: string; title?: string; content?: string; tags?: string[] };

		// IDのバリデーション
		let noteId: string;
		if (id) {
			// クライアントから送信されたIDを使用
			// ULIDの形式を簡易的にチェック（実際のプロジェクトではより厳密なバリデーションを推奨）
			if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(id)) {
				return json({ message: 'Invalid ID format' }, { status: 400 });
			}
			noteId = id;
		} else {
			// IDが提供されていない場合は、従来通りサーバー側で生成
			noteId = ulid();
		}

		const now = new Date();
		let noteTitle = title;
		const noteContent = content || '';

		// タイムラインからのポストの場合、タイトルを自動生成
		if (title === undefined) {
			const firstLine = noteContent.split('\n')[0] || '';
			// 本文からHTMLタグを除去し、最初の50文字をタイトルとする
			const plainTextFirstLine = firstLine.replace(/<[^>]*>/g, '');
			noteTitle = plainTextFirstLine.substring(0, 50) || 'Untitled Note';
		} else {
			noteTitle = title || 'Untitled Note';
		}

		const noteSlug = generateSlug(noteTitle); // スラッグを生成

		// 新規メモを作成
		await db.insert(notes).values({
			id: noteId,
			userId: session.session.userId,
			title: noteTitle,
			slug: noteSlug, // スラッグを保存
			content: noteContent,
			createdAt: now,
			updatedAt: now,
			isPublic: false
		});

		// タイムラインイベントを記録
		await db.insert(timeline).values({
			userId: session.session.userId,
			noteId: noteId,
			type: 'note_created',
			createdAt: now
		});

		// タグの処理
		if (tagNames && Array.isArray(tagNames) && tagNames.length > 0) {
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

		// After creating the note, update its links
		await updateNoteLinks(noteId, content || '', session.session.userId);

		const newNote = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);

		return json(newNote[0], { status: 201 });
	} catch (error) {
		// [デバッグ用ログ] エラー詳細を出力
		console.error('Error creating note:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json({ message: `Internal Server Error: ${errorMessage}` }, { status: 500 });
	}
};
