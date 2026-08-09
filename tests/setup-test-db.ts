import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '$lib/server/db/schema';

// Create a client for the in-memory database
const client = createClient({ url: 'file::memory:' });
export const db = drizzle(client, { schema });

// Function to create tables from the schema
// NOTE: These CREATE TABLE statements mirror src/lib/server/db/schema.ts
// and src/lib/server/db/auth-schema.ts (see also drizzle/ migrations).
export async function createTables() {
	// Use raw SQL to create tables. This is simpler than using drizzle-kit for tests.
	await client.execute(`
    CREATE TABLE user (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      email_verified INTEGER DEFAULT 0 NOT NULL,
      image TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      two_factor_enabled INTEGER DEFAULT 0,
      username TEXT,
      display_username TEXT
    );
  `);
	await client.execute(`CREATE UNIQUE INDEX user_email_unique ON user (email);`);
	await client.execute(`CREATE UNIQUE INDEX user_username_unique ON user (username);`);
	await client.execute(`
		CREATE TABLE session (
			id TEXT PRIMARY KEY NOT NULL,
			expires_at INTEGER NOT NULL,
			token TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			ip_address TEXT,
			user_agent TEXT,
			user_id TEXT NOT NULL,
			FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
		);
	`);
	await client.execute(`CREATE UNIQUE INDEX session_token_unique ON session (token);`);
	await client.execute(`CREATE INDEX session_userId_idx ON session (user_id);`);
	await client.execute(`
		CREATE TABLE account (
			id TEXT PRIMARY KEY NOT NULL,
			account_id TEXT NOT NULL,
			provider_id TEXT NOT NULL,
			user_id TEXT NOT NULL,
			access_token TEXT,
			refresh_token TEXT,
			id_token TEXT,
			access_token_expires_at INTEGER,
			refresh_token_expires_at INTEGER,
			scope TEXT,
			password TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
		);
	`);
	await client.execute(`CREATE INDEX account_userId_idx ON account (user_id);`);
	await client.execute(`
		CREATE TABLE verification (
			id TEXT PRIMARY KEY NOT NULL,
			identifier TEXT NOT NULL,
			value TEXT NOT NULL,
			expires_at INTEGER NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);
	`);
	await client.execute(`CREATE INDEX verification_identifier_idx ON verification (identifier);`);
	await client.execute(`
		CREATE TABLE passkey (
			id TEXT PRIMARY KEY NOT NULL,
			name TEXT,
			public_key TEXT NOT NULL,
			user_id TEXT NOT NULL,
			credential_id TEXT NOT NULL,
			counter INTEGER NOT NULL,
			device_type TEXT NOT NULL,
			backed_up INTEGER NOT NULL,
			transports TEXT,
			created_at INTEGER,
			aaguid TEXT,
			FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
		);
	`);
	await client.execute(`CREATE INDEX passkey_userId_idx ON passkey (user_id);`);
	await client.execute(`CREATE INDEX passkey_credentialID_idx ON passkey (credential_id);`);
	await client.execute(`
		CREATE TABLE two_factor (
			id TEXT PRIMARY KEY NOT NULL,
			secret TEXT NOT NULL,
			backup_codes TEXT NOT NULL,
			user_id TEXT NOT NULL,
			FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
		);
	`);
	await client.execute(`CREATE INDEX twoFactor_secret_idx ON two_factor (secret);`);
	await client.execute(`CREATE INDEX twoFactor_userId_idx ON two_factor (user_id);`);
	await client.execute(`
    CREATE TABLE notes (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Untitled Note',
      slug TEXT NOT NULL,
      content TEXT,
      content_bin BLOB,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_public INTEGER DEFAULT 0 NOT NULL,
      is_pinned INTEGER DEFAULT 0 NOT NULL,
      status TEXT DEFAULT 'inbox' NOT NULL,
      resolved_links TEXT,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );
  `);
	await client.execute(`
		CREATE UNIQUE INDEX notes_user_title_box_unique ON notes (user_id, title)
		WHERE status = 'box' AND title != '';
	`);
	await client.execute(`
		CREATE TABLE tags (
			id TEXT PRIMARY KEY NOT NULL,
			name TEXT NOT NULL,
			created_at INTEGER NOT NULL
		);
	`);
	await client.execute(`CREATE UNIQUE INDEX tags_name_unique ON tags (name);`);
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
	await client.execute(`
		CREATE TABLE timeline (
			id TEXT PRIMARY KEY NOT NULL,
			user_id TEXT NOT NULL,
			note_id TEXT,
			type TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			metadata TEXT,
			FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
			FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
		);
	`);
	await client.execute(`
		CREATE TABLE themes (
			id TEXT PRIMARY KEY NOT NULL,
			user_id TEXT NOT NULL,
			name TEXT NOT NULL,
			primary_color TEXT,
			secondary_color TEXT,
			accent_color TEXT,
			background_color TEXT,
			text_color TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
		);
	`);
	await client.execute(`
		CREATE TABLE user_settings (
			user_id TEXT PRIMARY KEY NOT NULL,
			theme_mode TEXT DEFAULT 'system' NOT NULL,
			light_theme_id TEXT DEFAULT 'sazanami-days' NOT NULL,
			dark_theme_id TEXT DEFAULT 'sazanami-night' NOT NULL,
			font TEXT DEFAULT 'sans-serif' NOT NULL,
			bio TEXT,
			FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
		);
	`);
}

// Function to drop tables for test cleanup
export async function dropTables() {
	await client.execute(`DROP TABLE IF EXISTS user_settings;`);
	await client.execute(`DROP TABLE IF EXISTS themes;`);
	await client.execute(`DROP TABLE IF EXISTS timeline;`);
	await client.execute(`DROP TABLE IF EXISTS note_attachments;`);
	await client.execute(`DROP TABLE IF EXISTS attachments;`);
	await client.execute(`DROP TABLE IF EXISTS note_links;`);
	await client.execute(`DROP TABLE IF EXISTS note_tags;`);
	await client.execute(`DROP TABLE IF EXISTS tags;`);
	await client.execute(`DROP TABLE IF EXISTS notes;`);
	await client.execute(`DROP TABLE IF EXISTS two_factor;`);
	await client.execute(`DROP TABLE IF EXISTS passkey;`);
	await client.execute(`DROP TABLE IF EXISTS verification;`);
	await client.execute(`DROP TABLE IF EXISTS account;`);
	await client.execute(`DROP TABLE IF EXISTS session;`);
	await client.execute(`DROP TABLE IF EXISTS user;`);
}
