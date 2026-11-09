import type { RequestHandler } from './$types';
import type { R2Bucket } from '$lib/server/storage';

/**
 * R2に保存した画像を配信する。
 * バケットは非公開のまま、Worker経由で /uploads/<key> として返す
 * （r2.dev の公開設定やカスタムドメインが不要）。
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

export const GET: RequestHandler = async ({ params, platform }) => {
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
		// ファイル名はULIDで不変なので長期キャッシュ可
		'cache-control': 'public, max-age=31536000, immutable',
		etag: object.httpEtag
	};
	if (!contentType) {
		headers['content-disposition'] = 'attachment';
	}

	return new Response(object.body, { headers });
};
