import { json, type RequestHandler } from '@sveltejs/kit';

import { db, updateNoteLinks } from '$lib/server/db';
import { notes, tags, noteTags } from '$lib/server/db/schema';
import { eq, or, like, desc, sql, and, inArray } from 'drizzle-orm';
import { ulid } from 'ulid';
import { getSessionCached } from '$lib/server/auth-session';
import { generateSlug } from '$lib/utils/slug'; // スラッグ生成ユーティリティをインポート

export const GET: RequestHandler = async ({ url, request }) => {
	const session = await getSessionCached(request.headers);
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
	const session = await getSessionCached(request.headers);
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

		if (typeof body !== 'object' || body === null) {
			return json({ message: 'Invalid request body' }, { status: 400 });
		}
		const {
			id,
			title,
			content,
			tags: tagNames,
			status,
			parentId
		} = body as {
			id?: string;
			title?: string;
			content?: string;
			tags?: string[];
			skipTimeline?: boolean;
			status?: string;
			parentId?: string;
		};

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

		// タイムラインや新規作成からのポストの場合、タイトルが未指定（undefined または空文字）であれば自動生成...しない
		if (title === undefined || title.trim() === '') {
			noteTitle = '';
		} else {
			noteTitle = title.trim();
		}

		const noteSlug = noteTitle ? generateSlug(noteTitle) : noteId; // タイトルが空の場合はIDをスラッグにする

		// Boxノートのバリデーション
		if (status === 'box') {
			// タイトルが必須
			if (!noteTitle || noteTitle.trim() === '') {
				return json({ message: 'Boxノートにはタイトルが必要です' }, { status: 400 });
			}
			// タイトルの一意性チェック
			const existingWithSameTitle = await db
				.select({ id: notes.id })
				.from(notes)
				.where(
					and(
						eq(notes.userId, session.session.userId),
						eq(notes.status, 'box'),
						eq(notes.title, noteTitle)
					)
				)
				.limit(1);
			if (existingWithSameTitle.length > 0) {
				return json(
					{ message: `「${noteTitle}」というタイトルのノートが既に存在します` },
					{ status: 409 }
				);
			}
		}

		// リプライの場合、親ノート（自分のもの）の存在チェック
		let parentNoteId: string | null = null;
		if (parentId) {
			const parent = await db
				.select({ id: notes.id })
				.from(notes)
				.where(and(eq(notes.id, parentId), eq(notes.userId, session.session.userId)))
				.limit(1);
			if (parent.length > 0) {
				parentNoteId = parent[0].id;
			}
		}

		// 新規メモを作成（作成行をそのまま返す）
		const [created] = await db
			.insert(notes)
			.values({
				id: noteId,
				userId: session.session.userId,
				title: noteTitle,
				slug: noteSlug, // スラッグを保存
				content: noteContent,
				createdAt: now,
				updatedAt: now,
				isPublic: false,
				parentId: parentNoteId,
				...(status ? { status } : {})
			})
			.returning();

		// タグの処理（既存タグを一括取得 → 新規タグをまとめて作成）
		if (tagNames && Array.isArray(tagNames) && tagNames.length > 0) {
			const names = [...new Set(tagNames.map((t) => (t || '').trim()).filter(Boolean))];
			if (names.length > 0) {
				const existingTags = await db.select().from(tags).where(inArray(tags.name, names));
				const tagIdByName = new Map(existingTags.map((t) => [t.name, t.id]));
				const newTags = names
					.filter((name) => !tagIdByName.has(name))
					.map((name) => ({ id: ulid(), name, createdAt: now }));
				if (newTags.length > 0) {
					await db.insert(tags).values(newTags);
					newTags.forEach((t) => tagIdByName.set(t.name, t.id));
				}
				await db
					.insert(noteTags)
					.values(names.map((name) => ({ noteId, tagId: tagIdByName.get(name)! })));
			}
		}

		// リンクの解決（新規ノートでリンクが無ければ内部でスキップ）
		await updateNoteLinks(noteId, noteContent, session.session.userId, { isNew: true });

		return json(created, { status: 201 });
	} catch (error) {
		// [デバッグ用ログ] エラー詳細を出力
		console.error('Error creating note:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json({ message: `Internal Server Error: ${errorMessage}` }, { status: 500 });
	}
};
