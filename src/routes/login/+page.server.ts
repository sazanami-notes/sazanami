import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

/**
 * ログイン画面に出すソーシャルログインのボタンは、
 * 認証情報が設定されているプロバイダだけを表示する。
 * （未設定のままボタンを出すと、押しても失敗して混乱するため）
 */
export const load: PageServerLoad = async ({ platform }) => {
	const platformEnv = (platform?.env ?? {}) as Record<string, string | undefined>;

	const has = (key: 'GOOGLE' | 'DISCORD') => {
		const id = platformEnv[`${key}_CLIENT_ID`] || env[`${key}_CLIENT_ID` as 'GOOGLE_CLIENT_ID'];
		const secret =
			platformEnv[`${key}_CLIENT_SECRET`] || env[`${key}_CLIENT_SECRET` as 'GOOGLE_CLIENT_SECRET'];
		return Boolean(id && secret);
	};

	return {
		social: {
			google: has('GOOGLE'),
			discord: has('DISCORD')
		}
	};
};
