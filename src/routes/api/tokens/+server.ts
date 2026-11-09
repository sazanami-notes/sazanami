import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { apiTokens } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { getPrincipal, generateRawToken, sha256Hex, parseScopes, type ApiScope } from '$lib/server/api-auth';
import { apiJson, apiError, preflight } from '$lib/server/api-response';

export const OPTIONS: RequestHandler = () => preflight();

/**
 * トークン一覧。管理操作はセッション（ブラウザ）のみ許可する。
 * トークン自身にトークン管理をさせない（権限昇格・横流しの防止）。
 */
export const GET: RequestHandler = async ({ request }) => {
	const principal = await getPrincipal(request);
	if (!principal) return apiError(401, 'unauthorized', 'ログインが必要です');
	if (principal.tokenId) return apiError(403, 'session_required', 'トークン管理はブラウザから行ってください');

	const rows = await db
		.select({
			id: apiTokens.id,
			name: apiTokens.name,
			prefix: apiTokens.prefix,
			scopes: apiTokens.scopes,
			lastUsedAt: apiTokens.lastUsedAt,
			expiresAt: apiTokens.expiresAt,
			revokedAt: apiTokens.revokedAt,
			createdAt: apiTokens.createdAt
		})
		.from(apiTokens)
		.where(eq(apiTokens.userId, principal.userId))
		.orderBy(desc(apiTokens.createdAt));

	return apiJson({
		tokens: rows.map((t) => ({ ...t, scopes: parseScopes(t.scopes) }))
	});
};

type CreateBody = {
	name?: unknown;
	scopes?: unknown;
	expiresInDays?: unknown;
};

export const POST: RequestHandler = async ({ request }) => {
	const principal = await getPrincipal(request);
	if (!principal) return apiError(401, 'unauthorized', 'ログインが必要です');
	if (principal.tokenId) return apiError(403, 'session_required', 'トークン管理はブラウザから行ってください');

	let body: CreateBody;
	try {
		body = (await request.json()) as CreateBody;
	} catch {
		return apiError(400, 'invalid_json', 'JSONボディが必要です');
	}

	const name = typeof body.name === 'string' ? body.name.trim() : '';
	if (!name) return apiError(400, 'name_required', 'トークン名を入力してください');
	if (name.length > 60) return apiError(400, 'name_too_long', 'トークン名は60文字以内にしてください');

	let scopes: ApiScope[] = ['read'];
	if (Array.isArray(body.scopes)) {
		const requested = body.scopes
			.filter((s): s is string => typeof s === 'string')
			.map((s) => s.toLowerCase())
			.filter((s): s is ApiScope => s === 'read' || s === 'write');
		if (requested.length > 0) scopes = [...new Set(requested)];
	}

	let expiresAt: Date | null = null;
	if (typeof body.expiresInDays === 'number' && Number.isFinite(body.expiresInDays)) {
		const days = Math.floor(body.expiresInDays);
		if (days < 1 || days > 3650) {
			return apiError(400, 'invalid_expiry', '有効期限は1〜3650日の範囲で指定してください');
		}
		expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
	}

	const raw = generateRawToken();
	const tokenHash = await sha256Hex(raw);
	const prefix = `${raw.slice(0, 12)}…`;

	const [created] = await db
		.insert(apiTokens)
		.values({
			userId: principal.userId,
			name,
			tokenHash,
			prefix,
			scopes: scopes.join(','),
			expiresAt,
			createdAt: new Date()
		})
		.returning();

	return apiJson(
		{
			// 平文トークンはこのレスポンスでしか返らない
			token: raw,
			id: created.id,
			name: created.name,
			prefix: created.prefix,
			scopes: parseScopes(created.scopes),
			expiresAt: created.expiresAt,
			createdAt: created.createdAt
		},
		{ status: 201 }
	);
};
