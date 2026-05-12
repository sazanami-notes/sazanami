import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';
import * as schema from './schema';
import { building } from '$app/environment';

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

/**
 * Lazy-initialized Drizzle ORM instance.
 *
 * During build (vite build / Cloudflare Pages build), environment variables
 * may not be available. We use a Proxy to defer client creation until the
 * first actual DB access at request time.
 */
export const db = new Proxy(
	{} as ReturnType<typeof drizzle<typeof schema>>,
	{
		get(_, prop) {
			if (building) return undefined;
			if (!_db) {
				const client = createClient({
					url: env.TURSO_DATABASE_URL!,
					authToken: env.TURSO_AUTH_TOKEN!
				});
				_db = drizzle(client, { schema });
			}
			return Reflect.get(_db, prop, _db);
		}
	}
);
