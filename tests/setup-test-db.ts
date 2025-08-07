import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '$lib/server/db/schema';
// import { sql } from 'drizzle-orm'; // sql は不要なので削除

// インメモリデータベースを作成
const sqlite = new Database(':memory:');
export const db = drizzle(sqlite, { schema });

// スキーマからテーブルを作成する関数
export async function createTables() {
	// notes テーブルのスキーマを直接作成
	sqlite.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Untitled Note',
      slug TEXT NOT NULL UNIQUE DEFAULT 'untitled-note',
      content TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_public BOOLEAN DEFAULT FALSE NOT NULL
    );
  `);

	// user テーブルのスキーマを直接作成
	sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER DEFAULT 0 NOT NULL,
      image TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

// テーブルを削除する関数（テストのクリーンアップ用）
export async function dropTables() {
	sqlite.exec(`DROP TABLE IF EXISTS notes;`);
	sqlite.exec(`DROP TABLE IF EXISTS user;`);
}
