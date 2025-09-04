import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { box, boxLinks } from '$lib/server/db/schema';
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
	const boxId = params.id;

	try {
		// 1. Get 1-hop links
		const targetBox = alias(box, 'targetBox');
		const oneHopLinksResult = await db
			.select({
				id: targetBox.id,
				title: targetBox.title,
				slug: targetBox.slug
			})
			.from(boxLinks)
			.innerJoin(targetBox, eq(boxLinks.targetBoxId, targetBox.id))
			.where(eq(boxLinks.sourceBoxId, boxId));

		// 2. Get backlinks
		const sourceBox = alias(box, 'sourceBox');
		const backlinksResult = await db
			.select({
				id: sourceBox.id,
				title: sourceBox.title,
				slug: sourceBox.slug
			})
			.from(boxLinks)
			.innerJoin(sourceBox, eq(boxLinks.sourceBoxId, sourceBox.id))
			.where(eq(boxLinks.targetBoxId, boxId));

		// 3. Get 2-hop links
		const oneHopLinkTargetIds = (
			await db
				.select({ id: boxLinks.targetBoxId })
				.from(boxLinks)
				.where(eq(boxLinks.sourceBoxId, boxId))
		).map((r) => r.id);

		let twoHopLinksResult: Link[] = [];
		if (oneHopLinkTargetIds.length > 0) {
			const twoHopTargetBox = alias(box, 'twoHopTargetBox');
			twoHopLinksResult = await db
				.select({
					id: twoHopTargetBox.id,
					title: twoHopTargetBox.title,
					slug: twoHopTargetBox.slug
				})
				.from(boxLinks)
				.innerJoin(twoHopTargetBox, eq(boxLinks.targetBoxId, twoHopTargetBox.id))
				.where(
					and(
						inArray(boxLinks.sourceBoxId, oneHopLinkTargetIds),
						not(eq(boxLinks.targetBoxId, boxId)), // Exclude links back to the original note
						not(inArray(boxLinks.targetBoxId, oneHopLinkTargetIds)) // Exclude direct 1-hop links
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
