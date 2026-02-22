import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';
import * as dotenv from 'dotenv';

dotenv.config();

// Create a client for the database
const client = createClient({
	url: env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL!,
	authToken: env.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN
});

import * as schema from './schema';

// Initialize Drizzle ORM with the client
export const db = drizzle(client, { schema });
