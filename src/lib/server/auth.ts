// src/lib/server/auth.ts

import { betterAuth } from 'better-auth';
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
    socialProviders: {
        google: { 
            clientId: env.GOOGLE_CLIENT_ID as string,
            clientSecret: env.GOOGLE_CLIENT_SECRET as string
        },
        apple: { 
            clientId: env.APPLE_CLIENT_ID as string,
            clientSecret: env.APPLE_CLIENT_SECRET as string,
            // Optional
            appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER as string,
        },
    },
	trustedOrigins: ["https://appleid.apple.com"],
	secret: env.BETTER_AUTH_SECRET,
	cookie: {
		path: '/'
	},
	plugins: [
		sveltekitCookies(getRequestEvent),
	],
	database: drizzleAdapter(db, {
		provider: 'sqlite',
		schema: schema
	})
});
