// src/lib/server/auth.ts

import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins'; // usernameプラグインをインポート
import { sveltekitCookies } from 'better-auth/svelte-kit'; // sveltekitCookiesプラグインをインポート
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '$env/dynamic/private';
import { db } from './db/connection';
import * as schema from './db/auth-schema';
import { getRequestEvent } from '$app/server';

export const auth = betterAuth({
	emailAndPassword: {
		enabled: true
	},
	secret: env.BETTER_AUTH_SECRET,
	cookie: {
		path: '/'
	},
	plugins: [
		username(), // usernameプラグインを追加
		sveltekitCookies(async () => await getRequestEvent())
	],
	database: drizzleAdapter(db, {
		provider: 'sqlite',
		schema: schema
	})
});
