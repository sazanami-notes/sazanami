import type { RequestHandler } from './$types';
import type { R2Bucket } from '$lib/server/storage';
import { db } from '$lib/server/db';
import { attachments, noteAttachments, notes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionCached } from '$lib/server/auth-session';

/**
 * R2に保存した画像を配信する。
 * バケットは非公開のまま、Worker経由で /uploads/<key> として返す
 * （r2.dev の公開設定やカスタムドメインが不要）。
 *
 * アクセス制御:
 * - 公開ノート（is_public かつ status='box'）に紐付く画像は誰でも取得可
 * - それ以外はアップロードした本人（セッション）だけ
 * - DBに存在しないキーは404（存在確認もさせない）
 *
 * セキュリティ:
 * - 拡張子は画像のみ許可し、Content-Type も拡張子から決める（保存時のメタデータは信用しない）
 * - nosniff + sandbox CSP により、万一 HTML/SVG が混ざっていても同一オリジンで実行させない
 */
const CONTENT_TYPES: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	avif: 'image/avif'
};

function extensionOf(key: string): string {
	const idx = key.lastIndexOf('.');
	return idx === -1 ? '' : key.slice(idx + 1).toLowerCase();
}

export const GET: RequestHandler = async ({ params, platform, request }) => {
	const bucket = (platform?.env as { R2?: R2Bucket } | undefined)?.R2;
	if (!bucket) {
		return new Response('Not found', { status: 404 });
	}

	const key = params.path;
	if (!key || key.includes('..')) {
		return new Response('Bad request', { status: 400 });
	}

	const ext = extensionOf(key);
	const contentType = CONTENT_TYPES[ext];

	const [row] = await db
		.select({ id: attachments.id, userId: attachments.userId })
		.from(attachments)
		.where(eq(attachments.filePath, `uploads/${key}`))
		.limit(1);

	let visibility: 'public' | 'owner' | null = null;

	if (row) {
		const links = await db
			.select({ isPublic: notes.isPublic, status: notes.status })
			.from(noteAttachments)
			.innerJoin(notes, eq(noteAttachments.noteId, notes.id))
			.where(eq(noteAttachments.attachmentId, row.id))
			.limit(20);

		if (links.some((link) => link.isPublic && link.status === 'box')) {
			visibility = 'public';
		} else {
			const session = await getSessionCached(request.headers);
			if (session?.user && session.user.id === row.userId) {
				visibility = 'owner';
			}
		}
	}

	if (!visibility) {
		return new Response('Not found', { status: 404 });
	}

	// R2のキーは "uploads/<file>" 形式（storage.ts の R2Driver と合わせる）
	const object = (await bucket.get(`uploads/${key}`)) ?? (await bucket.get(key));
	if (!object) {
		return new Response('Not found', { status: 404 });
	}

	const headers: Record<string, string> = {
		// 未知の拡張子はダウンロード扱いにして、ブラウザに解釈させない
		'content-type': contentType ?? 'application/octet-stream',
		'content-length': String(object.size),
		'x-content-type-options': 'nosniff',
		'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
		etag: object.httpEtag,
		// 公開画像は不変。所有者限定は短命にして、非公開化が早く効くようにする
		'cache-control':
			visibility === 'public'
				? 'public, max-age=31536000, immutable'
				: 'private, max-age=60, must-revalidate'
	};
	if (visibility === 'owner') {
		headers['vary'] = 'cookie';
	}
	if (!contentType) {
		headers['content-disposition'] = 'attachment';
	}

	return new Response(object.body, { headers });
};
