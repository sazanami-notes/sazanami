// src/lib/server/auth-session.ts
// リクエストスコープのセッションキャッシュ。
// hooks.server.ts・各 load・API ハンドラで同じ Headers（= 同じ Request オブジェクト）に
// 対して auth.api.getSession を1回だけ実行する。
// Cloudflare Workers + リモートDB（Turso）では getSession が複数クエリを伴うため、
// リクエスト内の重複呼び出しを Promise 共有で排除する。
import { createAuth } from '$lib/server/auth';

const auth = createAuth();

type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;
const sessionCache = new WeakMap<Headers, Promise<SessionResult>>();

/**
 * 同一リクエスト（同一 Headers オブジェクト）内では同じ Promise を返す。
 * hooks と load / API が並列に呼んでも DB クエリは1回のみ。
 */
export function getSessionCached(headers: Headers): Promise<SessionResult> {
	let cached = sessionCache.get(headers);
	if (!cached) {
		cached = auth.api.getSession({ headers });
		sessionCache.set(headers, cached);
	}
	return cached;
}
