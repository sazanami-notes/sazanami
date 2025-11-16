// src/lib/server/auth.ts

import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit'; // sveltekitCookiesプラグインをインポート
import { passkey } from "better-auth/plugins/passkey"
import { sendVerificationEmail } from './email';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '$env/dynamic/private';
import { db } from './db/connection';
import * as schema from './db/auth-schema';
import { getRequestEvent } from '$app/server';

export const auth = betterAuth({
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
	},
	emailVerification: {
		sendVerificationEmail: async ( { user, url }: { user: any; url: string }) => {
			try {
				await sendVerificationEmail(user, url);
			} catch (e) {
				console.error('Failed to send verification email:', e);
			}
		},
		sendOnSignIn: true,
		autoSignInAfterVerification: true
	},
    socialProviders: {
        google: { 
            clientId: env.GOOGLE_CLIENT_ID as string,
            clientSecret: env.GOOGLE_CLIENT_SECRET as string
        },
    },
	secret: env.BETTER_AUTH_SECRET,
	cookie: {
		path: '/'
	},
	plugins: [
		sveltekitCookies(getRequestEvent),
		passkey(),
	],
	database: drizzleAdapter(db, {
		provider: 'sqlite',
		schema: schema
	})
});
