import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user as userTable, notes, userSettings } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const { username } = params;

	if (!username) {
		throw error(400, 'Username is required');
	}

	const profiles = await db.select({
		userId: userSettings.userId,
		username: userSettings.username,
		bio: userSettings.bio,
		name: userTable.name,
		image: userTable.image
	})
	.from(userSettings)
	.innerJoin(userTable, eq(userSettings.userId, userTable.id))
	.where(eq(userSettings.username, username))
	.limit(1);

	if (profiles.length === 0) {
		throw error(404, 'User not found');
	}

	const profile = profiles[0];

	// Fetch public notes of this user
	const publicNotes = await db.select()
		.from(notes)
		.where(and(eq(notes.userId, profile.userId), eq(notes.isPublic, true)))
		.orderBy(desc(notes.updatedAt));

	return {
		profileUser: {
			name: profile.name,
			username: profile.username,
			bio: profile.bio,
			image: profile.image
		},
		publicNotes
	};
};
