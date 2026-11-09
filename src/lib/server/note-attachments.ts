// ノート本文とアップロード画像の紐付け。
// 画像は /uploads/<ULID>.<ext> で参照される。ノート保存時に本文を走査して
// note_attachments を洗い替えし、配信側（/uploads）が公開判定に使えるようにする。
import { db } from '$lib/server/db';
import { attachments, noteAttachments } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

/** 本文中の /uploads/<ULID>.<ext> から添付IDを抽出する */
const UPLOAD_PATH_RE = /\/uploads\/([0-9A-HJKMNP-TV-Z]{26})\.(?:png|jpe?g|gif|webp|avif)/gi;

export function extractAttachmentIds(content: string | null | undefined): string[] {
	if (!content) return [];
	const ids = new Set<string>();
	for (const match of content.matchAll(UPLOAD_PATH_RE)) {
		ids.add(match[1]);
	}
	return [...ids];
}

/**
 * ノートが参照している画像を紐付け直す（毎回洗い替え）。
 * 他人の添付IDを貼られても紐付けない（所有者本人の分だけ対象）。
 */
export async function syncNoteAttachments(
	noteId: string,
	userId: string,
	content: string | null | undefined
): Promise<void> {
	await db.delete(noteAttachments).where(eq(noteAttachments.noteId, noteId));

	const ids = extractAttachmentIds(content);
	if (ids.length === 0) return;

	const owned = await db
		.select({ id: attachments.id })
		.from(attachments)
		.where(and(eq(attachments.userId, userId), inArray(attachments.id, ids)));

	if (owned.length === 0) return;

	await db.insert(noteAttachments).values(owned.map((row) => ({ noteId, attachmentId: row.id })));
}
