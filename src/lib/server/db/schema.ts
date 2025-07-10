import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

// メモ用のテーブル
export const notes = sqliteTable('notes', {
	id: text('id').primaryKey(), // UUIDなどを想定
	userId: text('user_id').notNull(),
	content: text('content'), // Markdown本文
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;
