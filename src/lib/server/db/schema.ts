import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
// auth-schema.tsから必要なテーブル定義をインポート
import { user, session, account, verification } from '../../../../auth-schema';

// メモ用のテーブル
export const notes = sqliteTable('notes', {
	id: text('id').primaryKey(), // UUIDなどを想定
	userId: text('user_id').notNull(),
	content: text('content'), // Markdown本文
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// インポートしたテーブルを再度エクスポートして、Drizzle Kitが認識できるようにする
export { user, session, account, verification };
