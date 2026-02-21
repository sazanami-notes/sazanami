import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { userProfiles } from '$lib/server/db/schema';
import { eq, and, ne } from 'drizzle-orm';

export const load: PageServerLoad = async ({ parent }) => {
	const data = await parent();
	if (!data.user) {
		throw redirect(302, '/login');
	}

	return {
		user: data.user,
		profile: data.profile
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const username = formData.get('username') as string;
		const bio = formData.get('bio') as string;

		// Basic validation
		if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
			return fail(400, {
				error: 'ユーザー名は3〜20文字の英数字とアンダースコアのみ使用できます。'
			});
		}

		try {
			// Check if username is already taken by another user
			if (username) {
				const existingProfiles = await db.select().from(userProfiles)
					.where(and(eq(userProfiles.username, username), ne(userProfiles.userId, locals.user.id)))
					.limit(1);

				if (existingProfiles.length > 0) {
					return fail(400, { error: 'このユーザー名は既に使用されています。' });
				}
			}

			const existingProfile = await db.select().from(userProfiles)
				.where(eq(userProfiles.userId, locals.user.id))
				.limit(1);

			if (existingProfile.length > 0) {
				await db.update(userProfiles)
					.set({ username, bio, updatedAt: new Date() })
					.where(eq(userProfiles.userId, locals.user.id));
			} else {
				await db.insert(userProfiles)
					.values({ userId: locals.user.id, username, bio, updatedAt: new Date() });
			}

			return { success: true, message: 'プロフィールを更新しました。' };
		} catch (e) {
			console.error('Failed to update profile:', e);
			return fail(500, { error: 'プロフィールの更新に失敗しました。' });
		}
	}
};
