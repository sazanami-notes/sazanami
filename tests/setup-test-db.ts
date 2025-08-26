import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';

// Create a client for the in-memory database
const client = createClient({ url: 'file::memory:' });
export const db = drizzle(client, { schema });

// Function to create tables from the schema
export async function createTables() {
	// Use raw SQL to create tables. This is simpler than using drizzle-kit for tests.
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
    CREATE TABLE notes (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Untitled Note',
      slug TEXT NOT NULL,
      content TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_public BOOLEAN DEFAULT FALSE NOT NULL,
      is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
      status TEXT DEFAULT 'inbox' NOT NULL,
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
		CREATE TABLE note_tags (
			note_id TEXT NOT NULL,
			tag_id TEXT NOT NULL,
			PRIMARY KEY (note_id, tag_id),
			FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
			FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
		);
	`);
	await client.execute(`
		CREATE TABLE note_links (
			id TEXT PRIMARY KEY NOT NULL,
			source_note_id TEXT NOT NULL,
			target_note_id TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
			FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE CASCADE
		);
	`);
	await client.execute(`
		CREATE TABLE attachments (
			id TEXT PRIMARY KEY NOT NULL,
			user_id TEXT NOT NULL,
			file_name TEXT NOT NULL,
			file_path TEXT NOT NULL,
			mime_type TEXT NOT NULL,
			file_size INTEGER NOT NULL,
			created_at INTEGER NOT NULL,
			FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
		);
	`);
	await client.execute(`
		CREATE TABLE note_attachments (
			note_id TEXT NOT NULL,
			attachment_id TEXT NOT NULL,
			PRIMARY KEY (note_id, attachment_id),
			FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
			FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE CASCADE
		);
	`);
}

// Function to drop tables for test cleanup
export async function dropTables() {
	await client.execute(`DROP TABLE IF EXISTS note_attachments;`);
	await client.execute(`DROP TABLE IF EXISTS attachments;`);
	await client.execute(`DROP TABLE IF EXISTS note_links;`);
	await client.execute(`DROP TABLE IF EXISTS note_tags;`);
	await client.execute(`DROP TABLE IF EXISTS tags;`);
	await client.execute(`DROP TABLE IF EXISTS notes;`);
	await client.execute(`DROP TABLE IF EXISTS user;`);
}
