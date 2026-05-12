import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/connection';
import { user, userSettings } from '$lib/server/db/schema';
import { eq, or } from 'drizzle-orm';
import { createAuth } from '$lib/server/auth';
const auth = createAuth();
import { ulid } from 'ulid';
import { getStorageDriver } from '$lib/server/storage';

export const load: PageServerLoad = async ({ params, locals }) => {
	const identifier = params.username;
	const sessionUser = locals.session?.user;

	if (!sessionUser) {
		throw redirect(302, '/login');
	}

	// ユーザー本人のページか確認するために、DBから現在のユーザー情報を取得
	const foundUser = await db
		.select({
			id: user.id,
			name: user.name,
			username: user.username,
			image: user.image,
			bio: userSettings.bio
		})
		.from(user)
		.leftJoin(userSettings, eq(user.id, userSettings.userId))
		.where(or(eq(user.username, identifier), eq(user.id, identifier)))
		.get();

	if (!foundUser) {
		throw error(404, { message: 'User not found' });
	}

	// 本人でなければアクセス拒否
	if (foundUser.id !== sessionUser.id) {
		throw error(403, { message: 'Forbidden' });
	}

	return {
		profile: foundUser
	};
};

export const actions: Actions = {
	default: async (event) => {
		const sessionUser = event.locals.session?.user;
		if (!sessionUser) {
			throw error(401, 'Unauthorized');
		}

		const formData = await event.request.formData();
		const name = formData.get('name')?.toString().trim();
		const username = formData.get('username')?.toString().trim() || null;
		const bio = formData.get('bio')?.toString() || '';
		const imageFile = formData.get('image') as File | null;

		if (!name) {
			return fail(400, { name, username, bio, error: '名前は必須です' });
		}

		if (username !== null && !/^[a-zA-Z0-9_-]+$/.test(username)) {
			return fail(400, {
				name,
				username,
				bio,
				error: 'ユーザー名は半角英数字と_-のみ使用できます'
			});
		}

		try {
			// userSettingsが存在するか確認し、なければ作成
			const existingSettings = await db.query.userSettings.findFirst({
				where: eq(userSettings.userId, sessionUser.id)
			});

			if (existingSettings) {
				await db.update(userSettings).set({ bio }).where(eq(userSettings.userId, sessionUser.id));
			} else {
				await db.insert(userSettings).values({
					userId: sessionUser.id,
					bio
				});
			}

			// 画像ファイルの保存処理
			let imageUrl: string | undefined = undefined;
			if (imageFile && imageFile.size > 0) {
				const storage = await getStorageDriver();
				const uniqueId = ulid();
				const buffer = Buffer.from(await imageFile.arrayBuffer());
				const { url } = await storage.upload({
					fileId: `avatar_${uniqueId}`,
					fileName: imageFile.name,
					buffer,
					mimeType: imageFile.type
				});
				imageUrl = url;
			}

			// better-authのUpdateUser APIを利用してユーザー情報を更新
			// authのcontextを構築して updateUser を呼び出す
			const updateData: any = { name, username };
			if (imageUrl) {
				updateData.image = imageUrl;
			}

			await auth.api.updateUser({
				headers: event.request.headers,
				body: updateData
			});
		} catch (err: any) {
			console.error('Failed to update profile:', err);
			// unique constraint error for username
			if (
				err.message?.includes('UNIQUE constraint failed') ||
				err.message?.includes('already exists')
			) {
				return fail(400, { name, username, bio, error: 'このユーザー名は既に使用されています' });
			}
			return fail(500, { name, username, bio, error: 'プロフィールの更新に失敗しました' });
		}

		// ユーザー名が変更された場合は新しいURLへリダイレクト
		const redirectUrl = `/${username || sessionUser.id}`;
		throw redirect(302, redirectUrl);
	}
};
