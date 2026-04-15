import { defineConfig } from 'drizzle-kit';
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

const configDir = path.dirname(fileURLToPath(import.meta.url));

function resolveDatabaseUrl(url: string): string {
	if (!url.startsWith('file:')) {
		return url;
	}

	const dbPath = url.slice('file:'.length);
	if (dbPath === '' || dbPath === ':memory:' || path.isAbsolute(dbPath)) {
		return url;
	}

	const resolvedPath = path.resolve(configDir, dbPath).replace(/\\/g, '/');
	return `file:${resolvedPath}`;
}

const databaseUrl = resolveDatabaseUrl(process.env.TURSO_DATABASE_URL ?? 'file:local.db');
const authToken = process.env.TURSO_AUTH_TOKEN;

export default defineConfig({
	out: './drizzle',
	schema: './src/lib/server/db/schema.ts',
	dialect: databaseUrl.startsWith('file:') ? 'sqlite' : 'turso',
	dbCredentials: {
		url: databaseUrl,
		authToken: authToken
	}
});
