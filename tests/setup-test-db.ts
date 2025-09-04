import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '$lib/server/db/schema';

const client = createClient({ url: 'file::memory:' });
export const db = drizzle(client, { schema });

export async function createTables() {
	await client.execute(`
    CREATE TABLE user (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER DEFAULT 0 NOT NULL,
      image TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

	await client.execute(`
    CREATE TABLE timeline (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_pinned INTEGER DEFAULT 0 NOT NULL,
      status TEXT DEFAULT 'active' NOT NULL,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );
  `);

	await client.execute(`
    CREATE TABLE box (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Untitled Note',
      slug TEXT NOT NULL UNIQUE,
      content TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );
  `);

	await client.execute(`
		CREATE TABLE tags (
			id TEXT PRIMARY KEY NOT NULL,
			name TEXT NOT NULL UNIQUE,
			created_at INTEGER NOT NULL
		);
	`);

	await client.execute(`
		CREATE TABLE box_tags (
			box_id TEXT NOT NULL,
			tag_id TEXT NOT NULL,
			PRIMARY KEY (box_id, tag_id),
			FOREIGN KEY (box_id) REFERENCES box(id) ON DELETE CASCADE,
			FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
		);
	`);

	await client.execute(`
		CREATE TABLE box_links (
			id TEXT PRIMARY KEY NOT NULL,
			source_box_id TEXT NOT NULL,
			target_box_id TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			FOREIGN KEY (source_box_id) REFERENCES box(id) ON DELETE CASCADE,
			FOREIGN KEY (target_box_id) REFERENCES box(id) ON DELETE CASCADE
		);
	`);
}

export async function dropTables() {
	await client.execute(`DROP TABLE IF EXISTS box_links;`);
	await client.execute(`DROP TABLE IF EXISTS box_tags;`);
	await client.execute(`DROP TABLE IF EXISTS tags;`);
	await client.execute(`DROP TABLE IF EXISTS box;`);
	await client.execute(`DROP TABLE IF EXISTS timeline;`);
	await client.execute(`DROP TABLE IF EXISTS user;`);
}
