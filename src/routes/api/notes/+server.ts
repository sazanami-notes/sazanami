import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notes, tags, noteTags } from '$lib/server/db/schema';
import { eq, or, like, desc, sql, and } from 'drizzle-orm';
import { ulid } from 'ulid';

export const GET: RequestHandler = async ({ url, locals }) => {
	const session = locals.session;
	if (!session) {
		return new Response('Unauthorized', { status: 401 });
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
						eq(notes.userId, session.userId),
						or(
							like(notes.title, `%${search}%`),
							like(notes.content, `%${search}%`)
						)
					)
				)
				.orderBy(desc(notes.updatedAt))
				.limit(limit)
				.offset(offset);
		} else {
			notesList = await db
				.select()
				.from(notes)
				.where(eq(notes.userId, session.userId))
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
					tags: noteTagsList.map(nt => nt.name).filter(Boolean)
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
						eq(notes.userId, session.userId),
						or(
							like(notes.title, `%${search}%`),
							like(notes.content, `%${search}%`)
						)
					)
				);
		} else {
			totalCount = await db
				.select({ count: sql<number>`COUNT(*)` })
				.from(notes)
				.where(eq(notes.userId, session.userId));
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
		return new Response('Internal Server Error', { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = locals.session;
	if (!session) {
		return new Response('Unauthorized', { status: 401 });
	}

	try {
		const body = await request.json();
		if (typeof body !== 'object' || body === null) {
			return new Response('Invalid request body', { status: 400 });
		}
		const { title, content, tags: tagNames } = body as { title?: string; content?: string; tags?: string[] };

		const noteId = ulid();
		const now = new Date();

		// 新規メモを作成
		await db.insert(notes).values({
			id: noteId,
			userId: session.userId,
			title: title || 'Untitled Note',
			content: content || '',
			createdAt: now,
			updatedAt: now,
			isPublic: false
		});

		// タグの処理
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

		const newNote = await db
			.select()
			.from(notes)
			.where(eq(notes.id, noteId))
			.limit(1);

		return json(newNote[0], { status: 201 });
	} catch (error) {
		console.error('Error creating note:', error);
		return json({ message: 'Internal Server Error' }, { status: 500 });
	}
};