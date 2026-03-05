import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/connection';
import { userSettings, themes } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';
import { eq, and } from 'drizzle-orm';

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

	const userThemes = await db.query.themes.findMany({
		where: eq(themes.userId, session.user.id)
	});

	return {
		settings: settings || {
			themeMode: 'system',
			lightThemeId: 'sazanami-days',
			darkThemeId: 'sazanami-night',
			font: 'sans-serif'
		},
		userThemes
	};
};

export const actions: Actions = {
	saveSettings: async ({ request }) => {
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const themeMode = (formData.get('themeMode') as string) || 'system';
		const lightThemeId = (formData.get('lightThemeId') as string) || 'sazanami-days';
		const darkThemeId = (formData.get('darkThemeId') as string) || 'sazanami-night';
		const font = (formData.get('font') as string) || 'sans-serif';

		try {
			await db
				.insert(userSettings)
				.values({
					userId: session.user.id,
					themeMode,
					lightThemeId,
					darkThemeId,
					font
				})
				.onConflictDoUpdate({
					target: userSettings.userId,
					set: {
						themeMode,
						lightThemeId,
						darkThemeId,
						font
					}
				});

			return { success: true, message: '設定を保存しました。' };
		} catch (e) {
			console.error('Failed to update settings:', e);
			return fail(500, { message: '設定の保存に失敗しました。' });
		}
	},

	createTheme: async ({ request }) => {
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		if (!name || name.trim() === '') {
			return fail(400, { message: 'テーマ名を入力してください。' });
		}

		const primaryColor = formData.get('primaryColor') as string | null;
		const secondaryColor = formData.get('secondaryColor') as string | null;
		const accentColor = formData.get('accentColor') as string | null;
		const backgroundColor = formData.get('backgroundColor') as string | null;
		const textColor = formData.get('textColor') as string | null;
		const config = formData.get('config') as string | null;

		try {
			await db.insert(themes).values({
				userId: session.user.id,
				name,
				primaryColor: primaryColor || null,
				secondaryColor: secondaryColor || null,
				accentColor: accentColor || null,
				backgroundColor: backgroundColor || null,
				textColor: textColor || null,
				config: config || null
			});

			return { success: true, message: '新しいテーマを作成しました。' };
		} catch (e) {
			console.error('Failed to create theme:', e);
			return fail(500, { message: 'テーマの作成に失敗しました。' });
		}
	},

	deleteTheme: async ({ request }) => {
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const themeId = formData.get('themeId') as string;

		if (!themeId) {
			return fail(400, { message: 'テーマIDが指定されていません。' });
		}

		try {
			await db
				.delete(themes)
				.where(and(eq(themes.id, themeId), eq(themes.userId, session.user.id)));

			// 削除したテーマが設定されていた場合のフォールバック
			const settings = await db.query.userSettings.findFirst({
				where: eq(userSettings.userId, session.user.id)
			});

			if (settings) {
				let updateNeeded = false;
				let newLightThemeId = settings.lightThemeId;
				let newDarkThemeId = settings.darkThemeId;

				if (settings.lightThemeId === themeId) {
					newLightThemeId = 'sazanami-days';
					updateNeeded = true;
				}
				if (settings.darkThemeId === themeId) {
					newDarkThemeId = 'sazanami-night';
					updateNeeded = true;
				}

				if (updateNeeded) {
					await db
						.update(userSettings)
						.set({ lightThemeId: newLightThemeId, darkThemeId: newDarkThemeId })
						.where(eq(userSettings.userId, session.user.id));
				}
			}

			return { success: true, message: 'テーマを削除しました。' };
		} catch (e) {
			console.error('Failed to delete theme:', e);
			return fail(500, { message: 'テーマの削除に失敗しました。' });
		}
	},

	importTheme: async ({ request }) => {
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const configJson = formData.get('config') as string;

		if (!name || !name.trim()) {
			return fail(400, { message: 'テーマ名を入力してください。' });
		}

		if (!configJson || !configJson.trim()) {
			return fail(400, { message: 'JSON設定を入力してください。' });
		}

		try {
			const config = JSON.parse(configJson);
			// Daisy UI JSON形式かどうかの簡単なチェック (キーがいくつか存在するか)
			const essentialKeys = ['primary', 'secondary', 'accent', 'base-100'];
			const hasEssentialKeys = essentialKeys.some((key) => key in config || `--color-${key}` in config);

			if (!hasEssentialKeys) {
				// 形式が少し違う可能性もあるので警告しつつ進めるか、厳密にするか。
				// ここでは最低限のバリデーションとする。
			}

			// JSONから主要な色を抽出して、互換性のために保存する
			const primary = config.primary || config['--color-primary'];
			const secondary = config.secondary || config['--color-secondary'];
			const accent = config.accent || config['--color-accent'];
			const background = config['base-100'] || config['--color-base-100'];
			const text = config['base-content'] || config['--color-base-content'];

			await db.insert(themes).values({
				userId: session.user.id,
				name,
				primaryColor: primary || null,
				secondaryColor: secondary || null,
				accentColor: accent || null,
				backgroundColor: background || null,
				textColor: text || null,
				config: configJson
			});

			return { success: true, message: 'テーマをインポートしました。' };
		} catch (e) {
			console.error('Failed to import theme:', e);
			return fail(400, { message: '無効なJSON形式です。' });
		}
	}
};
