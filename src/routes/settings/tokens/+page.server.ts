import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/connection';
import { apiTokens } from '$lib/server/db/schema';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { generateRawToken, sha256Hex, parseScopes, type ApiScope } from '$lib/server/api-auth';
import { getSessionCached } from '$lib/server/auth-session';

const MAX_NAME_LENGTH = 60;
const MIN_EXPIRY_DAYS = 1;
const MAX_EXPIRY_DAYS = 3650;

export const load: PageServerLoad = async ({ request }) => {
	const sessionData = await getSessionCached(request.headers);

	if (!sessionData?.session) {
		throw redirect(302, '/login');
	}

	// 一覧はAPIを経由せずDBから直接読む（この画面はセッション必須のため）
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
		.where(eq(apiTokens.userId, sessionData.user.id))
		.orderBy(desc(apiTokens.createdAt));

	// 状態の判定はサーバー側で確定させる（SSRとハイドレーションの表示ズレを避ける）
	const now = Date.now();
	const tokens = rows.map((row) => ({
		...row,
		scopes: parseScopes(row.scopes),
		status: row.revokedAt
			? ('revoked' as const)
			: row.expiresAt && row.expiresAt.getTime() <= now
				? ('expired' as const)
				: ('active' as const)
	}));

	return { tokens };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const sessionData = await getSessionCached(request.headers);

		if (!sessionData?.session) {
			return fail(401, { success: false, message: 'ログインが必要です。' });
		}

		const formData = await request.formData();
		const name = String(formData.get('name') ?? '').trim();

		if (!name) {
			return fail(400, { success: false, message: 'トークン名を入力してください。' });
		}
		if (name.length > MAX_NAME_LENGTH) {
			return fail(400, {
				success: false,
				message: `トークン名は${MAX_NAME_LENGTH}文字以内にしてください。`
			});
		}

		// read は常に付与する。write は明示的にチェックされたときだけ追加する。
		const requested = formData
			.getAll('scopes')
			.filter((scope): scope is string => typeof scope === 'string');
		const scopes = new Set<ApiScope>(['read']);
		if (requested.includes('write')) scopes.add('write');
		const scopeList = [...scopes];

		const rawExpiry = String(formData.get('expiresInDays') ?? '').trim();
		let expiresAt: Date | null = null;

		if (rawExpiry !== '') {
			const days = Number(rawExpiry);
			if (!Number.isInteger(days) || days < MIN_EXPIRY_DAYS || days > MAX_EXPIRY_DAYS) {
				return fail(400, {
					success: false,
					message: `有効期限は${MIN_EXPIRY_DAYS}〜${MAX_EXPIRY_DAYS}日の範囲で指定してください。`
				});
			}
			expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
		}

		const raw = generateRawToken();
		const tokenHash = await sha256Hex(raw);
		const prefix = `${raw.slice(0, 12)}…`;

		try {
			await db.insert(apiTokens).values({
				userId: sessionData.user.id,
				name,
				tokenHash,
				prefix,
				scopes: scopeList.join(','),
				expiresAt,
				createdAt: new Date()
			});
		} catch (e) {
			console.error('Failed to create API token:', e);
			return fail(500, { success: false, message: 'トークンの発行に失敗しました。' });
		}

		return {
			success: true,
			// 平文トークンはこの戻り値でのみ返す。DBにはSHA-256ハッシュしか保存しない。
			token: raw,
			message: `「${name}」のトークンを発行しました。`
		};
	},

	revoke: async ({ request }) => {
		const sessionData = await getSessionCached(request.headers);

		if (!sessionData?.session) {
			return fail(401, { success: false, message: 'ログインが必要です。' });
		}

		const formData = await request.formData();
		const id = String(formData.get('id') ?? '').trim();

		if (!id) {
			return fail(400, { success: false, message: 'トークンIDが指定されていません。' });
		}

		try {
			const [updated] = await db
				.update(apiTokens)
				.set({ revokedAt: new Date() })
				.where(
					and(
						eq(apiTokens.id, id),
						eq(apiTokens.userId, sessionData.user.id),
						isNull(apiTokens.revokedAt)
					)
				)
				.returning({ id: apiTokens.id });

			if (!updated) {
				return fail(404, {
					success: false,
					message: 'トークンが見つかりません（すでに失効している可能性があります）。'
				});
			}
		} catch (e) {
			console.error('Failed to revoke API token:', e);
			return fail(500, { success: false, message: 'トークンの失効に失敗しました。' });
		}

		return { success: true, message: 'トークンを失効させました。' };
	}
};
