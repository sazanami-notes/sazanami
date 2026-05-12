// src/lib/server/auth.ts

import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { magicLink, twoFactor, username } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { sendVerificationEmail, sendMagicLink, sendResetPasswordEmail } from './email';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '$env/dynamic/private';
import { db } from './db/connection';
import * as schema from './db/auth-schema';
import { getRequestEvent } from '$app/server';
import { building } from '$app/environment';

export function createAuth(platformEnv?: Record<string, string>) {
	// During build, env vars are unavailable - return a minimal placeholder.
	// The real auth instance is created at request time in hooks.server.ts.
	if (building) {
		return {} as ReturnType<typeof betterAuth>;
	}

	const authUrl = platformEnv?.BETTER_AUTH_URL || env.BETTER_AUTH_URL || 'http://localhost:5173';
	const authSecret = platformEnv?.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET;
	const googleClientId = platformEnv?.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID;
	const googleClientSecret = platformEnv?.GOOGLE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET;

	return betterAuth({
		appName: 'Sazanami',
		baseURL: authUrl,
		secret: authSecret,
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
			sendResetPassword: async ({ user, url }) => {
				try {
					await sendResetPasswordEmail(user, url);
				} catch (e) {
					console.error('Failed to send reset password email:', e);
				}
			}
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
			google: googleClientId
				? {
						clientId: googleClientId,
						clientSecret: googleClientSecret || ''
					}
				: undefined
		},
		cookie: {
			path: '/'
		},
		plugins: [
			sveltekitCookies(getRequestEvent),
			passkey(),
			twoFactor({
				issuer: 'Sazanami'
			}),
			magicLink({
				sendMagicLink: async ({ email, url }) => {
					try {
						await sendMagicLink({ email, url });
					} catch (e) {
						console.error('Failed to send magic link email:', e);
					}
				}
			}),
			username()
		],
		database: drizzleAdapter(db, {
			provider: 'sqlite',
			schema: schema
		})
	});
}
