import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { ulid } from 'ulid';
// auth-schema.tsから必要なテーブル定義をインポート
import { user, session, account, verification } from '../../../../auth-schema';

// NOTES テーブル
export const notes = sqliteTable('notes', {
  id: text('id').notNull().primaryKey().$defaultFn(() => ulid()), // ULIDなどを想定
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('Untitled Note'),
  content: text('content'), // Markdown本文
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(), // 作成日時 (MSタイムスタンプ)
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(), // 更新日時 (MSタイムスタンプ)
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
});
// インデックスはdrizzle-kitのgenerateで自動生成されることを期待

// TAGS テーブル
export const tags = sqliteTable('tags', {
  id: text('id').notNull().primaryKey().$defaultFn(() => ulid()), // ULIDなどを想定
  name: text('name').notNull().unique(), // タグの名前 (ユニーク制約)
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});
// インデックスはdrizzle-kitのgenerateで自動生成されることを期待


// NOTE_TAGS テーブル (多対多の中間テーブル)
export const noteTags = sqliteTable('note_tags', {
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  // 複合主キーはdrizzle-kitに認識させるか、後で定義する
});
// インデックスはdrizzle-kitのgenerateで自動生成されることを期待


// NOTE_LINKS テーブル (ノート間のリンク)
export const noteLinks = sqliteTable('note_links', {
  id: text('id').notNull().primaryKey().$defaultFn(() => ulid()), // ULIDなどを想定
  sourceNoteId: text('source_note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  targetNoteId: text('target_note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});
// インデックスはdrizzle-kitのgenerateで自動生成されることを期待


// ATTACHMENTS テーブル
export const attachments = sqliteTable('attachments', {
  id: text('id').notNull().primaryKey().$defaultFn(() => ulid()), // ULIDなどを想定
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(), // S3などの外部ストレージパスやURL
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(), // バイト単位
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});
// インデックスはdrizzle-kitのgenerateで自動生成されることを期待


// NOTE_ATTACHMENTS テーブル (多対多の中間テーブル)
export const noteAttachments = sqliteTable('note_attachments', {
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  attachmentId: text('attachment_id').notNull().references(() => attachments.id, { onDelete: 'cascade' }),
  // 複合主キーはdrizzle-kitに認識させるか、後で定義する
});

// インポートした認証関連テーブルを再度エクスポート
export { user, session, account, verification };
