import { sqliteTable, integer, text, uniqueIndex, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { ulid } from 'ulid';
// auth-schema.tsから必要なテーブル定義をインポート
import {
	user,
	session,
	account,
	verification,
	passkey,
	twoFactor,
	userRelations,
	sessionRelations,
	accountRelations,
	passkeyRelations,
	twoFactorRelations
} from './auth-schema';
// generateSlug のインポートは不要なので削除

// NOTES テーブル
export const notes = sqliteTable(
	'notes',
	{
		id: text('id')
			.notNull()
			.primaryKey()
			.$defaultFn(() => ulid()), // ULIDなどを想定
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		title: text('title').notNull().default('Untitled Note'),
		slug: text('slug').notNull(), // スラッグを追加 (デフォルト値はマイグレーションで処理)
		content: text('content'), // Markdownコンテンツ
		contentBin: blob('content_bin', { mode: 'buffer' }), // Yjsドキュメントのバイナリデータ
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(), // 作成日時 (MSタイムスタンプ)
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(), // 更新日時 (MSタイムスタンプ)
		isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
		isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
		status: text('status').notNull().default('inbox'), // inbox, box, archived, trash
		resolvedLinks: text('resolved_links') // WikiLink解決用のタイトル->IDマップ (JSON)
	},
	(table) => [
		// Boxノートのタイトルはユーザー内で一意にする（WikiLink解決のため）
		// SQLiteのpartial index: status='box' かつ title!='' の場合のみ適用
		uniqueIndex('notes_user_title_box_unique')
			.on(table.userId, table.title)
			.where(sql`${table.status} = 'box' AND ${table.title} != ''`)
	]
);

// TAGS テーブル
export const tags = sqliteTable('tags', {
	id: text('id')
		.notNull()
		.primaryKey()
		.$defaultFn(() => ulid()), // ULIDなどを想定
	name: text('name').notNull().unique(), // タグの名前 (ユニーク制約)
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});
// インデックスはdrizzle-kitのgenerateで自動生成されることを期待

// NOTE_TAGS テーブル (多対多の中間テーブル)
export const noteTags = sqliteTable('note_tags', {
	noteId: text('note_id')
		.notNull()
		.references(() => notes.id, { onDelete: 'cascade' }),
	tagId: text('tag_id')
		.notNull()
		.references(() => tags.id, { onDelete: 'cascade' })
	// 複合主キーはdrizzle-kitに認識させるか、後で定義する
});
// インデックスはdrizzle-kitのgenerateで自動生成されることを期待

// NOTE_LINKS テーブル (ノート間のリンク)
export const noteLinks = sqliteTable('note_links', {
	id: text('id')
		.notNull()
		.primaryKey()
		.$defaultFn(() => ulid()), // ULIDなどを想定
	sourceNoteId: text('source_note_id')
		.notNull()
		.references(() => notes.id, { onDelete: 'cascade' }),
	targetNoteId: text('target_note_id')
		.notNull()
		.references(() => notes.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});
// インデックスはdrizzle-kitのgenerateで自動生成されることを期待

// ATTACHMENTS テーブル
export const attachments = sqliteTable('attachments', {
	id: text('id')
		.notNull()
		.primaryKey()
		.$defaultFn(() => ulid()), // ULIDなどを想定
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	fileName: text('file_name').notNull(),
	filePath: text('file_path').notNull(), // S3などの外部ストレージパスやURL
	mimeType: text('mime_type').notNull(),
	fileSize: integer('file_size').notNull(), // バイト単位
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
});
// インデックスはdrizzle-kitのgenerateで自動生成されることを期待

// NOTE_ATTACHMENTS テーブル (多対多の中間テーブル)
export const noteAttachments = sqliteTable('note_attachments', {
	noteId: text('note_id')
		.notNull()
		.references(() => notes.id, { onDelete: 'cascade' }),
	attachmentId: text('attachment_id')
		.notNull()
		.references(() => attachments.id, { onDelete: 'cascade' })
	// 複合主キーはdrizzle-kitに認識させるか、後で定義する
});

// TIMELINE テーブル
export const timeline = sqliteTable('timeline', {
	id: text('id')
		.notNull()
		.primaryKey()
		.$defaultFn(() => ulid()),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	noteId: text('note_id').references(() => notes.id, { onDelete: 'cascade' }),
	type: text('type').notNull(), // e.g., 'note_created', 'note_updated'
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	metadata: text('metadata') // JSON string for extra data
});

// インポートした認証関連テーブルを再度エクスポート
export { user, session, account, verification, passkey, twoFactor };

// THEMES テーブル (ユーザー作成テーマ)
export const themes = sqliteTable('themes', {
	id: text('id')
		.notNull()
		.primaryKey()
		.$defaultFn(() => ulid()),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	primaryColor: text('primary_color'),
	secondaryColor: text('secondary_color'),
	accentColor: text('accent_color'),
	backgroundColor: text('background_color'),
	textColor: text('text_color'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => Date.now()),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => Date.now())
});

// USER SETTINGS テーブル (外観設定など)
export const userSettings = sqliteTable('user_settings', {
	userId: text('user_id')
		.notNull()
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	themeMode: text('theme_mode').notNull().default('system'), // 'light', 'dark', 'system'
	lightThemeId: text('light_theme_id').notNull().default('sazanami-days'), // 組み込みテーマ名 or themes.id
	darkThemeId: text('dark_theme_id').notNull().default('sazanami-night'), // 組み込みテーマ名 or themes.id
	font: text('font').notNull().default('sans-serif'),
	bio: text('bio')
});
