// src/lib/server/auth.ts

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit'; // [追加]
import { getRequestEvent } from '$app/server'; // [追加]
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { BETTER_AUTH_SECRET } from '$env/static/private';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		schema: schema,
		provider: 'sqlite'
	}),
	emailAndPassword: {
		enabled: true
	},
	secret: BETTER_AUTH_SECRET,
	// [追加] ここにpluginsセクションを追加します
	plugins: [sveltekitCookies(async () => getRequestEvent())]	
});