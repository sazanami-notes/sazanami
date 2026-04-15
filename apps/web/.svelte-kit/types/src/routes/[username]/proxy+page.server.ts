// @ts-nocheck
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/connection';
import { user, userSettings, notes } from '$lib/server/db/schema';
import { eq, or, and, desc } from 'drizzle-orm';

export const load = async ({ params, locals }: Parameters<PageServerLoad>[0]) => {
	const identifier = params.username;

	// identifierがusernameかidに一致するユーザーを検索
	const foundUser = await db
		.select({
			id: user.id,
			name: user.name,
			username: user.username,
			image: user.image,
			createdAt: user.createdAt,
			bio: userSettings.bio
		})
		.from(user)
		.leftJoin(userSettings, eq(user.id, userSettings.userId))
		.where(or(eq(user.username, identifier), eq(user.id, identifier)))
		.get();

	if (!foundUser) {
		throw error(404, { message: 'User not found' });
	}

	// 現在のユーザーが自分自身のページを見ているか判定
	const isOwner = locals.session?.user?.id === foundUser.id;

	// ユーザーの公開ノート（本人の場合はピン留めなども表示対象にするなど調整可能）
	// ここではシンプルに「公開されているノート」または「自分が所有するノート（本人の場合）」を取得
	const userNotes = await db.query.notes.findMany({
		where: and(
			eq(notes.userId, foundUser.id),
			isOwner ? undefined : eq(notes.isPublic, true), // 他人のページなら公開のみ
			eq(notes.status, 'inbox') // archivedやtrashは除外
		),
		orderBy: [desc(notes.createdAt)],
		limit: 50 // とりあえず50件
	});

	return {
		profile: foundUser,
		isOwner,
		notes: userNotes
	};
};
