import type { RequestHandler } from './$types';
import type { R2Bucket } from '$lib/server/storage';

/**
 * R2に保存した画像を配信する。
 * バケットは非公開のまま、Worker経由で /uploads/<key> として返す
 * （r2.dev の公開設定やカスタムドメインが不要）。
 */
export const GET: RequestHandler = async ({ params, platform }) => {
	const bucket = (platform?.env as { R2?: R2Bucket } | undefined)?.R2;
	if (!bucket) {
		return new Response('Not found', { status: 404 });
	}

	const key = params.path;
	if (!key || key.includes('..')) {
		return new Response('Bad request', { status: 400 });
	}

	// R2のキーは "uploads/<file>" 形式（storage.ts の R2Driver と合わせる）
	let object = await bucket.get(`uploads/${key}`);
	if (!object) {
		object = await bucket.get(key);
	}
	if (!object) {
		return new Response('Not found', { status: 404 });
	}

	return new Response(object.body, {
		headers: {
			'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
			'content-length': String(object.size),
			// ファイル名はULIDで不変なので長期キャッシュ可
			'cache-control': 'public, max-age=31536000, immutable',
			etag: object.httpEtag
		}
	});
};
