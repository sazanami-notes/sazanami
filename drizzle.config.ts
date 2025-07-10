import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	out: './migrations',
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite'
});
