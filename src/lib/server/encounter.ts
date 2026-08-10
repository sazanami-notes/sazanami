/**
 * 出会い（Encounter）ロジック
 *
 * FSRS風の重み付きランダムで、過去のノートを再提示する。
 * - クーリングオフ: 最後に表示してから COOL_OFF_MS 経過したものだけ候補
 * - 重み: 経過日数 × (1 + encounterBoost × 0.3)
 *   - 長い間見ていないノートほど出やすい
 *   - 「また会いたい」フィードバック（boost+1）で出やすくなる
 */
import { db } from '$lib/server/db';
import { notes } from '$lib/server/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

export const COOL_OFF_MS = 24 * 60 * 60 * 1000; // 24時間
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BOOST = 5;
const MIN_BOOST = -5;

export interface EncounterCandidate {
	id: string;
	title: string;
	content: string | null;
	slug: string;
	createdAt: Date;
	encounterCount: number;
	encounterBoost: number;
}

/**
 * 次の出会いを1件取得する。表示したノートには出会い記録（lastEncounteredAt / encounterCount）を付ける。
 * 候補が無い場合は null を返す。
 */
export async function pickEncounter(userId: string): Promise<EncounterCandidate | null> {
	const now = Date.now();
	const coolOffCutoff = new Date(now - COOL_OFF_MS);

	const candidates = await db
		.select({
			id: notes.id,
			title: notes.title,
			content: notes.content,
			slug: notes.slug,
			createdAt: notes.createdAt,
			lastEncounteredAt: notes.lastEncounteredAt,
			encounterCount: notes.encounterCount,
			encounterBoost: notes.encounterBoost
		})
		.from(notes)
		.where(
			and(
				eq(notes.userId, userId),
				inArray(notes.status, ['inbox', 'box']),
				sql`(${notes.lastEncounteredAt} IS NULL OR ${notes.lastEncounteredAt} < ${coolOffCutoff.getTime()})`
			)
		);

	if (candidates.length === 0) {
		return null;
	}

	// 重み付きランダム選択
	const weighted = candidates.map((c) => {
		// 初回（未表示）は作成時点からの経過日数で重み付け
		const lastSeen = c.lastEncounteredAt?.getTime() ?? c.createdAt.getTime();
		const elapsedDays = Math.max((now - lastSeen) / DAY_MS, 0.1);
		const weight = Math.max(elapsedDays * (1 + c.encounterBoost * 0.3), 0.1);
		return { ...c, weight };
	});

	const totalWeight = weighted.reduce((sum, c) => sum + c.weight, 0);
	let r = Math.random() * totalWeight;
	let chosen = weighted[0];
	for (const c of weighted) {
		r -= c.weight;
		if (r <= 0) {
			chosen = c;
			break;
		}
	}

	// 出会いとして記録
	await db
		.update(notes)
		.set({
			lastEncounteredAt: new Date(now),
			encounterCount: chosen.encounterCount + 1
		})
		.where(eq(notes.id, chosen.id));

	return {
		id: chosen.id,
		title: chosen.title,
		content: chosen.content,
		slug: chosen.slug,
		createdAt: chosen.createdAt,
		encounterCount: chosen.encounterCount + 1,
		encounterBoost: chosen.encounterBoost
	};
}

/**
 * フィードバック（like: +1 / skip: -1）を反映する。
 * 所有者以外のノートには適用できない（対象ノートが無ければ false）。
 */
export async function applyEncounterFeedback(
	userId: string,
	noteId: string,
	action: 'like' | 'skip'
): Promise<{ success: boolean; encounterBoost: number }> {
	const noteArray = await db
		.select({ encounterBoost: notes.encounterBoost })
		.from(notes)
		.where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
		.limit(1);

	if (noteArray.length === 0) {
		return { success: false, encounterBoost: 0 };
	}

	const delta = action === 'like' ? 1 : -1;
	const newBoost = Math.min(Math.max(noteArray[0].encounterBoost + delta, MIN_BOOST), MAX_BOOST);

	await db.update(notes).set({ encounterBoost: newBoost }).where(eq(notes.id, noteId));

	return { success: true, encounterBoost: newBoost };
}
