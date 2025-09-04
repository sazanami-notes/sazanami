// 認証関連テーブル (変更なし)
import { user, session, account, verification } from './auth-schema';
export { user, session, account, verification };

// --- 新しいスキーマ案 ---

import { sqliteTable, integer, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { ulid } from 'ulid';

// TIMELINE テーブル (タイムライン画面用)
export const timeline = sqliteTable('timeline', {
	id: text('id').notNull().primaryKey().$defaultFn(() => ulid()),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	content: text('content').notNull(), // Markdown本文
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
	isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
	status: text('status').notNull().default('active') // active, archived, trash
});

// BOX テーブル (Box画面用)
export const box = sqliteTable('box', {
	id: text('id').notNull().primaryKey().$defaultFn(() => ulid()),
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	title: text('title').notNull().default('Untitled Note'),
	slug: text('slug').notNull().unique(), // WikiリンクやURLで利用
	content: text('content'), // Markdown本文
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

// TAGS テーブル (Boxのノートを整理するため)
export const tags = sqliteTable('tags', {
	id: text('id').notNull().primaryKey().$defaultFn(() => ulid()),
	name: text('name').notNull().unique(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});

// BOX_TAGS テーブル (boxとtagsの中間テーブル)
export const boxTags = sqliteTable('box_tags', {
	boxId: text('box_id').notNull().references(() => box.id, { onDelete: 'cascade' }),
	tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' })
}, (t) => ({
    pk: primaryKey({ columns: [t.boxId, t.tagId] }),
}));


// BOX_LINKS テーブル (ノート間のWikiリンク)
export const boxLinks = sqliteTable('box_links', {
	id: text('id').notNull().primaryKey().$defaultFn(() => ulid()),
	sourceBoxId: text('source_box_id').notNull().references(() => box.id, { onDelete: 'cascade' }),
	targetBoxId: text('target_box_id').notNull().references(() => box.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});