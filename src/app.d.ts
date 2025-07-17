// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: import('better-auth').User | null;
			session: import('better-auth').Session | null;
			db: import("drizzle-orm/d1").DrizzleD1Database<typeof import('$lib/server/db/schema')> | null;
			auth: import('better-auth').BetterAuthSvelteKitAPI;
		}
	}
	interface Platform {
		env?: {
			DB: D1Database; // D1からDBに変更
		}
	}
} // interface PageData {}
// interface PageState {}

// interface Platform {}
export {};
