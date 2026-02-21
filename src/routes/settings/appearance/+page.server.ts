import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/connection';
import { userSettings } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ request }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	if (!session) {
		throw redirect(302, '/login');
	}

	const settings = await db.query.userSettings.findFirst({
		where: eq(userSettings.userId, session.user.id)
	});

	return {
		settings: settings || {
			theme: 'system',
			font: 'sans-serif',
			primaryColor: null,
			secondaryColor: null,
			accentColor: null,
			backgroundColor: null,
			textColor: null
		}
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const theme = (formData.get('theme') as string) || 'system';
		const font = (formData.get('font') as string) || 'sans-serif';
		const primaryColor = formData.get('primaryColor') as string | null;
		const secondaryColor = formData.get('secondaryColor') as string | null;
		const accentColor = formData.get('accentColor') as string | null;
		const backgroundColor = formData.get('backgroundColor') as string | null;
		const textColor = formData.get('textColor') as string | null;

		try {
			await db
				.insert(userSettings)
				.values({
					userId: session.user.id,
					theme,
					font,
					primaryColor: primaryColor || null,
					secondaryColor: secondaryColor || null,
					accentColor: accentColor || null,
					backgroundColor: backgroundColor || null,
					textColor: textColor || null
				})
				.onConflictDoUpdate({
					target: userSettings.userId,
					set: {
						theme,
						font,
						primaryColor: primaryColor || null,
						secondaryColor: secondaryColor || null,
						accentColor: accentColor || null,
						backgroundColor: backgroundColor || null,
						textColor: textColor || null
					}
				});

			return { success: true, message: '設定を保存しました。' };
		} catch (e) {
			console.error('Failed to update settings:', e);
			return fail(500, { message: '設定の保存に失敗しました。' });
		}
	}
};
