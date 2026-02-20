// src/lib/server/auth.ts

import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit'; // sveltekitCookiesプラグインをインポート
import { magicLink, twoFactor } from "better-auth/plugins";
import { passkey } from "better-auth/plugins/passkey"
import { sendVerificationEmail, sendMagicLink } from './email';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '$env/dynamic/private';
import { db } from './db/connection';
import * as schema from './db/auth-schema';
import { getRequestEvent } from '$app/server';

export const auth = betterAuth({
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
	},
	emailVerification: {
		sendVerificationEmail: async ({ user, url }) => {
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
		twoFactor({
			issuer: "Sazanami"
		}),
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				try {
					await sendMagicLink({ email, url });
				} catch (e) {
					console.error('Failed to send magic link email:', e);
				}
			},
		})
	],
	database: drizzleAdapter(db, {
		provider: 'sqlite',
		schema: schema
	})
});
