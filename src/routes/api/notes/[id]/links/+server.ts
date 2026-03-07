import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { notes, noteLinks, tags, noteTags } from '$lib/server/db/schema';
import { eq, and, not, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { auth } from '$lib/server/auth';
import type { Note } from '$lib/types';

export const GET: RequestHandler = async ({ params, request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}
	const noteId = params.id;

	try {
		const attachTags = async (noteRecords: any[]) => {
			if (noteRecords.length === 0) return [];
			const noteIds = noteRecords.map(r => r.id);
			const tagsResult = await db
				.select({
					noteId: noteTags.noteId,
					tagName: tags.name
				})
				.from(noteTags)
				.innerJoin(tags, eq(noteTags.tagId, tags.id))
				.where(inArray(noteTags.noteId, noteIds));

			const tagsMap = new Map<string, string[]>();
			for (const row of tagsResult) {
				if (!tagsMap.has(row.noteId)) {
					tagsMap.set(row.noteId, []);
				}
				tagsMap.get(row.noteId)!.push(row.tagName);
			}

			return noteRecords.map(n => ({
				...n,
				tags: tagsMap.get(n.id) || []
			}));
		};

		// 1. Get 1-hop links
		const targetNote = alias(notes, 'targetNote');
		const oneHopLinksData = await db
			.select({ note: targetNote })
			.from(noteLinks)
			.innerJoin(targetNote, eq(noteLinks.targetNoteId, targetNote.id))
			.where(eq(noteLinks.sourceNoteId, noteId));
		const oneHopLinksResult = await attachTags(oneHopLinksData.map(d => d.note));

		// 2. Get backlinks
		const sourceNote = alias(notes, 'sourceNote');
		const backlinksData = await db
			.select({ note: sourceNote })
			.from(noteLinks)
			.innerJoin(sourceNote, eq(noteLinks.sourceNoteId, sourceNote.id))
			.where(eq(noteLinks.targetNoteId, noteId));
		const backlinksResult = await attachTags(backlinksData.map(d => d.note));

		// 3. Get 2-hop links
		const oneHopLinkTargetIds = (
			await db
				.select({ id: noteLinks.targetNoteId })
				.from(noteLinks)
				.where(eq(noteLinks.sourceNoteId, noteId))
		).map((r) => r.id);

		let twoHopLinksData: any[] = [];
		if (oneHopLinkTargetIds.length > 0) {
			const twoHopTargetNote = alias(notes, 'twoHopTargetNote');
			twoHopLinksData = await db
				.select({ note: twoHopTargetNote })
				.from(noteLinks)
				.innerJoin(twoHopTargetNote, eq(noteLinks.targetNoteId, twoHopTargetNote.id))
				.where(
					and(
						inArray(noteLinks.sourceNoteId, oneHopLinkTargetIds),
						not(eq(noteLinks.targetNoteId, noteId)), // Exclude links back to the original note
						not(inArray(noteLinks.targetNoteId, oneHopLinkTargetIds)) // Exclude direct 1-hop links
					)
				);
		}

		const twoHopLinksRaw = await attachTags(twoHopLinksData.map(d => d.note));

		// Deduplicate 2-hop links
		const uniqueTwoHopLinks = new Map<string, Note>();
		twoHopLinksRaw.forEach((link: any) => {
			uniqueTwoHopLinks.set(link.slug, link);
		});

		return json({
			oneHopLinks: oneHopLinksResult,
			backlinks: backlinksResult,
			twoHopLinks: Array.from(uniqueTwoHopLinks.values())
		});
	} catch (error) {
		console.error('Error fetching links from DB:', error);
		return json({ message: 'Internal Server Error' }, { status: 500 });
	}
};
