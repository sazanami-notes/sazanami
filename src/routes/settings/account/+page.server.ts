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

	return {
		user: sessionData.user,
		accounts
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
					message: e.body.message
				});
			}
			return fail(500, {
				message: '不明なエラーが発生しました。'
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
			// Check if user has enough authentication methods remaining
			const userAccounts = await db
				.select()
				.from(account)
				.where(eq(account.userId, sessionData.user.id));

			// If the user only has one account (the one they are trying to unlink), prevent it.
			// Note: This logic assumes that 'password' auth also creates an entry in 'account' table.
			// If password auth is handled differently (e.g. only in user table but hidden), this check might be too strict or incorrect.
			// However, based on schema, 'account' table has 'password' field, so it's likely used for credential auth too.
			if (userAccounts.length <= 1) {
				return fail(400, {
					message:
						'最後のログイン手段は解除できません。パスワードを設定するか、別の方法を連携してください。'
				});
			}

			// Also check if the specific account exists before deleting
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
