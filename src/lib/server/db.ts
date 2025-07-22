import { drizzle } from 'drizzle-orm/libsql';
import { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } from '$env/static/private';
import * as schema from '$lib/server/db/schema';


export const db = drizzle({ connection: {
	url: TURSO_DATABASE_URL, 
	authToken: TURSO_AUTH_TOKEN 
  }});
