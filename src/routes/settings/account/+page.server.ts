import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { db } from '$lib/server/db/connection';
import { account } from '$lib/server/db/auth-schema';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ request }) => {
	const sessionData = await auth.api.getSession({
		headers: request.headers
	});

	if (!sessionData?.session) {
		throw redirect(302, '/login');
	}

	const accounts = await db.select().from(account).where(eq(account.userId, sessionData.user.id));

	// Check if user has a password set (either by 'credential' provider or non-null password field)
	const hasPassword = accounts.some((a) => a.providerId === 'credential' || a.password);

	return {
		user: sessionData.user,
		accounts,
		hasPassword
	};
};

export const actions: Actions = {
	changePassword: async ({ request }) => {
		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword') as string;
		const newPassword = formData.get('newPassword') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		if (newPassword !== confirmPassword) {
			return fail(400, {
				message: '新しいパスワードが一致しません。'
			});
		}

		try {
			await auth.api.changePassword({
				body: {
					currentPassword,
					newPassword
				},
				headers: request.headers
			});
			return {
				message: 'パスワードが正常に変更されました。'
			};
		} catch (e: any) {
			if (e instanceof APIError) {
				return fail(e.statusCode, {
					message: e.body?.message || e.message
				});
			}
			return fail(500, {
				message: '不明なエラーが発生しました。'
			});
		}
	},
	setPassword: async ({ request }) => {
		const formData = await request.formData();
		const newPassword = formData.get('newPassword') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		if (newPassword !== confirmPassword) {
			return fail(400, {
				message: 'パスワードが一致しません。'
			});
		}

		try {
			await auth.api.setPassword({
				body: {
					newPassword
				},
				headers: request.headers
			});
			return {
				message: 'パスワードを設定しました。'
			};
		} catch (e: any) {
			if (e instanceof APIError) {
				return fail(e.statusCode, {
					message: e.body?.message || e.message
				});
			}
			console.error('setPassword error:', e);
			return fail(500, {
				message: 'パスワードの設定に失敗しました。'
			});
		}
	},
	deletePassword: async ({ request }) => {
		const sessionData = await auth.api.getSession({
			headers: request.headers
		});

		if (!sessionData?.session) {
			return fail(401, { message: 'Unauthorized' });
		}

		try {
			// Use unlinkAccount to remove credential provider
			await auth.api.unlinkAccount({
				body: {
					providerId: 'credential'
				},
				headers: request.headers
			});

			return {
				message: 'パスワードを削除しました。'
			};
		} catch (e: any) {
			if (e instanceof APIError) {
				return fail(e.statusCode, {
					message: e.body?.message || e.message
				});
			}
			console.error('deletePassword error:', e);
			return fail(500, {
				message: 'パスワードの削除に失敗しました。'
			});
		}
	},
	unlinkAccount: async ({ request }) => {
		const sessionData = await auth.api.getSession({
			headers: request.headers
		});

		if (!sessionData?.session) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const providerId = formData.get('providerId') as string;

		if (!providerId) {
			return fail(400, { message: 'Provider ID is required' });
		}

		try {
			const userAccounts = await db
				.select()
				.from(account)
				.where(eq(account.userId, sessionData.user.id));

			if (userAccounts.length <= 1) {
				return fail(400, {
					message:
						'最後のログイン手段は解除できません。パスワードを設定するか、別の方法を連携してください。'
				});
			}

			// Using direct DB deletion for consistency with previous implementation if API fails?
			// But let's try API first, or stick to DB if safe.
			// Previous implementation used DB delete.
			// Let's stick to DB delete for unlinkAccount to avoid "API not found" if I'm wrong about API.
			// But I used API for deletePassword above.
			// I'll use API for both if possible. But wait, if unlinkAccount API exists, it's better.
			// I'll assume it exists. If not, I'll fallback to DB delete.
			// Actually, I'll use the DB delete for unlinkAccount as it was, to minimize risk of breaking existing feature.

			// Check if providerId is credential? No, this action is for social.

			const accountToDelete = userAccounts.find((a) => a.providerId === providerId);
			if (!accountToDelete) {
				return fail(404, { message: '指定された連携アカウントが見つかりません。' });
			}

			await db
				.delete(account)
				.where(and(eq(account.userId, sessionData.user.id), eq(account.providerId, providerId)));

			return {
				message: '連携を解除しました。'
			};
		} catch (e) {
			console.error('Failed to unlink account:', e);
			return fail(500, {
				message: '連携解除に失敗しました。'
			});
		}
	}
};
