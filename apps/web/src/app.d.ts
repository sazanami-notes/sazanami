// See https://svelte.dev/docs/kit/types#app.d.ts

// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: import('better-auth').User | null;
			session: import('better-auth').Session | null;
		}
		interface Platform {
			env: {
				TURSO_DATABASE_URL: string;
				TURSO_AUTH_TOKEN: string;
				BETTER_AUTH_SECRET: string;
				BETTER_AUTH_URL?: string;
				GOOGLE_CLIENT_ID?: string;
				GOOGLE_CLIENT_SECRET?: string;
				SMTP_USER?: string;
				SMTP_PASS?: string;
				SMTP_FROM?: string;
				SMTP_HOST?: string;
				SMTP_PORT?: string;
				SMTP_SECURE?: string;
				STORAGE_DRIVER?: string;
				S3_REGION?: string;
				S3_BUCKET?: string;
				S3_ACCESS_KEY_ID?: string;
				S3_SECRET_ACCESS_KEY?: string;
				S3_ENDPOINT?: string;
				S3_PUBLIC_URL?: string;
			};
		}
	}
}

export {};
