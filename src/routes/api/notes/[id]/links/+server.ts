import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { notes, noteLinks } from '$lib/server/db/schema';
import { eq, and, not, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { auth } from '$lib/server/auth';

type Link = {
	id: string;
	title: string;
	slug: string;
};

export const GET: RequestHandler = async ({ params, request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}
	const noteId = params.id;

	try {
		// 1. Get 1-hop links
		const targetNote = alias(notes, 'targetNote');
		const oneHopLinksResult = await db
			.select({
				id: targetNote.id,
				title: targetNote.title,
				slug: targetNote.slug
			})
			.from(noteLinks)
			.innerJoin(targetNote, eq(noteLinks.targetNoteId, targetNote.id))
			.where(eq(noteLinks.sourceNoteId, noteId));

		// 2. Get backlinks
		const sourceNote = alias(notes, 'sourceNote');
		const backlinksResult = await db
			.select({
				id: sourceNote.id,
				title: sourceNote.title,
				slug: sourceNote.slug
			})
			.from(noteLinks)
			.innerJoin(sourceNote, eq(noteLinks.sourceNoteId, sourceNote.id))
			.where(eq(noteLinks.targetNoteId, noteId));

		// 3. Get 2-hop links
		const oneHopLinkTargetIds = (
			await db
				.select({ id: noteLinks.targetNoteId })
				.from(noteLinks)
				.where(eq(noteLinks.sourceNoteId, noteId))
		).map((r) => r.id);

		let twoHopLinksResult: Link[] = [];
		if (oneHopLinkTargetIds.length > 0) {
			const twoHopTargetNote = alias(notes, 'twoHopTargetNote');
			twoHopLinksResult = await db
				.select({
					id: twoHopTargetNote.id,
					title: twoHopTargetNote.title,
					slug: twoHopTargetNote.slug
				})
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

		// Deduplicate 2-hop links
		const uniqueTwoHopLinks = new Map<string, Link>();
		twoHopLinksResult.forEach((link) => {
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
