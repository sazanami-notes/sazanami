import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

export const load: PageServerLoad = async ({ request }) => {
	const sessionData = await auth.api.getSession({
		headers: request.headers
	});

	if (!sessionData?.session) {
		throw redirect(302, '/login');
	}

	return {
		user: sessionData.user
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
	}
};
