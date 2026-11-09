// src/lib/server/api-auth.ts
// 外部API/MCP用の認証レイヤ。
// 2系統を受け付ける:
//   1) `Authorization: Bearer sznm_...` — 個人アクセストークン（api_tokens にSHA-256で保存）
//   2) セッションCookie（ブラウザからの内部利用）
// 既存の getSessionCached を壊さずに、その上にトークン認証を足す。
import { db } from '$lib/server/db';
import { apiTokens } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionCached } from '$lib/server/auth-session';

export type ApiScope = 'read' | 'write';

export type ApiPrincipal = {
	userId: string;
	scopes: ApiScope[];
	/** トークン認証のときだけ入る（セッション認証では undefined） */
	tokenId?: string;
};

export const TOKEN_PREFIX = 'sznm_';

export function generateRawToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	return `${TOKEN_PREFIX}${b64}`;
}

export async function sha256Hex(input: string): Promise<string> {
	const data = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest('SHA-256', data);
	let out = '';
	for (const b of new Uint8Array(digest)) out += b.toString(16).padStart(2, '0');
	return out;
}

export function parseScopes(value: string | null | undefined): ApiScope[] {
	if (!value) return ['read'];
	const scopes = value
		.split(',')
		.map((s) => s.trim().toLowerCase())
		.filter((s): s is ApiScope => s === 'read' || s === 'write');
	return scopes.length > 0 ? [...new Set(scopes)] : ['read'];
}

export function hasScope(principal: ApiPrincipal, scope: ApiScope): boolean {
	return principal.scopes.includes(scope);
}

/**
 * リクエストから主体（ユーザー）を解決する。解決できなければ null。
 * トークンの最終使用日時は待たずに裏で更新する（レイテンシを増やさない）。
 */
export async function getPrincipal(request: Request): Promise<ApiPrincipal | null> {
	const header = request.headers.get('authorization') ?? '';

	if (header.toLowerCase().startsWith('bearer ')) {
		const raw = header.slice(7).trim();
		if (!raw.startsWith(TOKEN_PREFIX)) return null;

		const hash = await sha256Hex(raw);
		const rows = await db.select().from(apiTokens).where(eq(apiTokens.tokenHash, hash)).limit(1);
		const token = rows[0];
		if (!token) return null;
		if (token.revokedAt) return null;
		if (token.expiresAt && token.expiresAt.getTime() <= Date.now()) return null;

		void db
			.update(apiTokens)
			.set({ lastUsedAt: new Date() })
			.where(eq(apiTokens.id, token.id))
			.then(
				() => undefined,
				() => undefined
			);

		return { userId: token.userId, scopes: parseScopes(token.scopes), tokenId: token.id };
	}

	const session = await getSessionCached(request.headers);
	if (session?.session) {
		return { userId: session.session.userId, scopes: ['read', 'write'] };
	}
	return null;
}
