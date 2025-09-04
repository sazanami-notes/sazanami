import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db, updateBoxLinks } from '$lib/server/db';
import { box, tags, boxTags } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { ulid } from 'ulid';
import { auth } from '$lib/server/auth';
import { generateSlug } from '$lib/utils/slug';

export const GET: RequestHandler = async ({ params, request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	if (!params.id) {
		return new Response('Note ID is required', { status: 400 });
	}

	const boxId = params.id;

	try {
		const note = await db
			.select()
			.from(box)
			.where(and(eq(box.id, boxId), eq(box.userId, session.user.id)))
			.limit(1);

		if (note.length === 0) {
			return new Response('Note not found', { status: 404 });
		}

		const boxTagsList = await db
			.select({ name: tags.name })
			.from(boxTags)
			.leftJoin(tags, eq(boxTags.tagId, tags.id))
			.where(eq(boxTags.boxId, boxId));

		const noteWithTags = {
			...note[0],
			tags: boxTagsList.map((nt) => nt.name).filter(Boolean)
		};

		return json(noteWithTags);
	} catch (error) {
		console.error('Error fetching note:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	if (!params.id) {
		return new Response('Note ID is required', { status: 400 });
	}

	const boxId = params.id;

	try {
		const body = await request.json();
		if (typeof body !== 'object' || body === null) {
			return new Response('Invalid request body', { status: 400 });
		}
		const { title, content, tags: tagNames } = body as {
			title?: string;
			content?: string;
			tags?: string[];
		};

		const existingNote = await db
			.select()
			.from(box)
			.where(and(eq(box.id, boxId), eq(box.userId, session.user.id)))
			.limit(1);

		if (existingNote.length === 0) {
			return new Response('Note not found', { status: 404 });
		}

		const now = new Date();
		const updatedTitle = title !== undefined ? title : existingNote[0].title;
		const updatedSlug = generateSlug(updatedTitle);

		const updatedFields: Record<string, unknown> = {
			updatedAt: now,
			slug: updatedSlug
		};

		if (title !== undefined) {
			updatedFields.title = title;
		}
		if (content !== undefined) {
			updatedFields.content = content;
		}

		await db
			.update(box)
			.set(updatedFields)
			.where(and(eq(box.id, boxId), eq(box.userId, session.user.id)));

		if (tagNames && Array.isArray(tagNames)) {
			await db.delete(boxTags).where(eq(boxTags.boxId, boxId));

			for (const tagName of tagNames) {
				if (!tagName || !tagName.trim()) continue;

				const trimmedTagName = tagName.trim();

				const existingTag = await db.select().from(tags).where(eq(tags.name, trimmedTagName));

				let tagId: string;

				if (existingTag.length === 0) {
					tagId = ulid();
					await db.insert(tags).values({
						id: tagId,
						name: trimmedTagName,
						createdAt: now
					});
				} else {
					tagId = existingTag[0].id;
				}

				await db.insert(boxTags).values({
					boxId,
					tagId
				});
			}
		}

		const finalContent = content !== undefined ? content : existingNote[0].content;
		await updateBoxLinks(boxId, finalContent || '', session.user.id);

		const updatedNote = await db
			.select()
			.from(box)
			.where(and(eq(box.id, boxId), eq(box.userId, session.user.id)))
			.limit(1);

		const boxTagsList = await db
			.select({ name: tags.name })
			.from(boxTags)
			.leftJoin(tags, eq(boxTags.tagId, tags.id))
			.where(eq(boxTags.boxId, boxId));

		const noteWithTags = {
			...updatedNote[0],
			tags: boxTagsList.map((nt) => nt.name).filter(Boolean)
		};

		return json(noteWithTags);
	} catch (error) {
		console.error('Error updating note:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	if (!params.id) {
		return new Response('Note ID is required', { status: 400 });
	}

	const boxId = params.id;

	try {
		const existingNote = await db
			.select()
			.from(box)
			.where(and(eq(box.id, boxId), eq(box.userId, session.user.id)))
			.limit(1);

		if (existingNote.length === 0) {
			return new Response('Note not found', { status: 404 });
		}

		await db.delete(boxTags).where(eq(boxTags.boxId, boxId));

		await db.delete(box).where(and(eq(box.id, boxId), eq(box.userId, session.user.id)));

		return new Response(null, { status: 204 });
	} catch (error) {
		console.error('Error deleting note:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
};
