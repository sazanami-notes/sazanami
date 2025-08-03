// src/lib/server/auth.ts

import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins'; // usernameプラグインをインポート
import { BETTER_AUTH_SECRET } from '$env/static/private';

export const auth = betterAuth({
	emailAndPassword: {
		enabled: true
	},
	secret: BETTER_AUTH_SECRET,
	plugins: [
		username() // usernameプラグインを追加
	]
});