import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dotenvCandidates = [
	path.resolve(process.cwd(), '.env'),
	path.resolve(process.cwd(), '..', '.env'),
	path.resolve(process.cwd(), '..', '..', '.env')
];

for (const dotenvPath of dotenvCandidates) {
	if (fs.existsSync(dotenvPath)) {
		dotenv.config({ path: dotenvPath });
		break;
	}
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const webAppRoot = path.resolve(moduleDir, '../../../../');

function resolveDatabaseUrl(url: string): string {
	if (!url.startsWith('file:')) {
		return url;
	}

	const dbPath = url.slice('file:'.length);
	if (dbPath === '' || dbPath === ':memory:' || path.isAbsolute(dbPath)) {
		return url;
	}

	const resolvedPath = path.resolve(webAppRoot, dbPath).replace(/\\/g, '/');
	return `file:${resolvedPath}`;
}

const databaseUrl = resolveDatabaseUrl(process.env.TURSO_DATABASE_URL ?? 'file:local.db');
const authToken = process.env.TURSO_AUTH_TOKEN;

// Create a client for the database
const client = createClient({
	url: databaseUrl,
	authToken
});

import * as schema from './schema';

// Initialize Drizzle ORM with the client
export const db = drizzle(client, { schema });
