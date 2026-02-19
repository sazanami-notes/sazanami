// See https://svelte.dev/docs/kit/types#app.d.ts

// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: import('better-auth').User | null;
			session: import('better-auth').Session | null;
			auth: ReturnType<typeof import('$lib/server/auth').createAuth>['api'];
		}
		interface Platform {}
	}
}

export {};
