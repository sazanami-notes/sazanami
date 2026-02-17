import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
    throw new Error('TURSO_DATABASE_URL is not defined');
}

const client = createClient({
	url: url,
	authToken: process.env.TURSO_AUTH_TOKEN
});

export const db = drizzle(client, { schema });
