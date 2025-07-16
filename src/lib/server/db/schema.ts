import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

// メモ用のテーブル
export const notes = sqliteTable('notes', {
	id: text('id').primaryKey(), // UUIDなどを想定
	userId: text('user_id').notNull(),
	content: text('content'), // Markdown本文
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});
