/**
 * Environment variable helper for Cloudflare Workers + local dev.
 *
 * On Cloudflare Workers: env vars come from wrangler.toml / .dev.vars,
 * and SvelteKit's adapter-cloudflare polyfills $env/dynamic/private
 * to read from platform.env automatically.
 *
 * This module provides a shared interface and a helper to extract
 * platform env when available (for per-request auth instantiation).
 */
import { env as privateEnv } from '$env/dynamic/private';

export interface AppEnv {
	TURSO_DATABASE_URL: string;
	TURSO_AUTH_TOKEN: string;
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_URL: string;
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
}

/**
 * Extract auth-related env vars from platform.env (Cloudflare Workers),
 * falling back to $env/dynamic/private (local dev).
 */
export function getAuthEnv(platformEnv?: Record<string, string>): {
	BETTER_AUTH_URL: string;
	BETTER_AUTH_SECRET: string;
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
} {
	if (platformEnv) {
		return {
			BETTER_AUTH_URL: platformEnv.BETTER_AUTH_URL || privateEnv.BETTER_AUTH_URL || 'http://localhost:5173',
			BETTER_AUTH_SECRET: platformEnv.BETTER_AUTH_SECRET || privateEnv.BETTER_AUTH_SECRET,
			GOOGLE_CLIENT_ID: platformEnv.GOOGLE_CLIENT_ID || privateEnv.GOOGLE_CLIENT_ID,
			GOOGLE_CLIENT_SECRET: platformEnv.GOOGLE_CLIENT_SECRET || privateEnv.GOOGLE_CLIENT_SECRET
		};
	}
	return {
		BETTER_AUTH_URL: privateEnv.BETTER_AUTH_URL || 'http://localhost:5173',
		BETTER_AUTH_SECRET: privateEnv.BETTER_AUTH_SECRET,
		GOOGLE_CLIENT_ID: privateEnv.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: privateEnv.GOOGLE_CLIENT_SECRET
	};
}
