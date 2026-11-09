import {
	sqliteTable,
	integer,
	text,
	index,
	uniqueIndex,
	customType,
	type AnySQLiteColumn
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { ulid } from 'ulid';
// auth-schema.tsから必要なテーブル定義をインポート
import { user, session, account, verification, passkey, twoFactor } from './auth-schema';
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
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(), // 作成日時 (MSタイムスタンプ)
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(), // 更新日時 (MSタイムスタンプ)
		isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
		isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
		status: text('status').notNull().default('inbox'), // inbox, box, archived, trash
		resolvedLinks: text('resolved_links'), // WikiLink解決用のタイトル->IDマップ (JSON)
		// Layer 1: 人間が後から追記するコンテキスト（生メモ content とは分離）
		context: text('context'),
		// Layer 2: AI生成の提案（JSON: { summary?, tags?, related? }）※BYOKで生成
		aiSuggestions: text('ai_suggestions'),
		// 出会い（Encounter）機能用: FSRS式の重み付きランダム再提示
		lastEncounteredAt: integer('last_encountered_at', { mode: 'timestamp_ms' }), // 最後に出会いとして表示した日時
		encounterCount: integer('encounter_count').notNull().default(0), // 出会い回数
		encounterBoost: integer('encounter_boost').notNull().default(0), // フィードバック（また会いたい:+1 / スルー:-1）
		// リプライ（タイムラインのスレッド表示用）: 親ノートへの参照。親が消えてもメモは残す
		parentId: text('parent_id').references((): AnySQLiteColumn => notes.id, {
			onDelete: 'set null'
		})
	},
	(table) => [
		// Boxノートのタイトルはユーザー内で一意にする（WikiLink解決のため）
		// SQLiteのpartial index: status='box' かつ title!='' の場合のみ適用
		uniqueIndex('notes_user_title_box_unique')
			.on(table.userId, table.title)
			.where(sql`${table.status} = 'box' AND ${table.title} != ''`),
		// 一覧・検索・公開プロフィールの主要クエリ用（user_id で絞ってから status / 並び順）
		index('notes_user_status_updated_idx').on(table.userId, table.status, table.updatedAt),
		index('notes_user_updated_idx').on(table.userId, table.updatedAt),
		index('notes_user_public_status_idx').on(table.userId, table.isPublic, table.status),
		index('notes_parent_idx').on(table.parentId)
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
export const noteTags = sqliteTable(
	'note_tags',
	{
		noteId: text('note_id')
			.notNull()
			.references(() => notes.id, { onDelete: 'cascade' }),
		tagId: text('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
		// 複合主キーはdrizzle-kitに認識させるか、後で定義する
	},
	(table) => [
		index('note_tags_note_idx').on(table.noteId),
		index('note_tags_tag_idx').on(table.tagId)
	]
);

// NOTE_LINKS テーブル (ノート間のリンク)
export const noteLinks = sqliteTable(
	'note_links',
	{
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
	},
	(table) => [
		index('note_links_source_idx').on(table.sourceNoteId),
		index('note_links_target_idx').on(table.targetNoteId)
	]
);

// ATTACHMENTS テーブル
export const attachments = sqliteTable(
	'attachments',
	{
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
	},
	(table) => [
		index('attachments_user_created_idx').on(table.userId, table.createdAt),
		// /uploads の公開判定で file_path を引くため
		index('attachments_file_path_idx').on(table.filePath)
	]
);

// NOTE_ATTACHMENTS テーブル (多対多の中間テーブル)
export const noteAttachments = sqliteTable(
	'note_attachments',
	{
		noteId: text('note_id')
			.notNull()
			.references(() => notes.id, { onDelete: 'cascade' }),
		attachmentId: text('attachment_id')
			.notNull()
			.references(() => attachments.id, { onDelete: 'cascade' })
		// 複合主キーはdrizzle-kitに認識させるか、後で定義する
	},
	(table) => [
		index('note_attachments_note_idx').on(table.noteId),
		index('note_attachments_attachment_idx').on(table.attachmentId)
	]
);

// TIMELINE テーブル
export const timeline = sqliteTable(
	'timeline',
	{
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
	},
	(table) => [index('timeline_user_created_idx').on(table.userId, table.createdAt)]
);

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
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date())
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
	// エディタのブロックハンドル（Notion風ドラッグハンドル）を表示するか
	blockHandleEnabled: integer('block_handle_enabled', { mode: 'boolean' }).notNull().default(true),
	bio: text('bio')
});

// API TOKENS テーブル（外部API・MCP用の個人アクセストークン）
// 平文トークンは保存せず、SHA-256ハッシュのみを持つ。発行時に一度だけ平文を返す。
export const apiTokens = sqliteTable(
	'api_tokens',
	{
		id: text('id')
			.notNull()
			.primaryKey()
			.$defaultFn(() => ulid()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		tokenHash: text('token_hash').notNull(),
		prefix: text('prefix').notNull(), // 表示用（例: sznm_a1b2c3d4）
		scopes: text('scopes').notNull().default('read'), // カンマ区切り: read,write
		lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
		revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [uniqueIndex('api_tokens_hash_unique').on(table.tokenHash)]
);

// NOTE EMBEDDINGS テーブル（意味検索用のベクトル）
// Turso ネイティブのベクトル列（FLOAT32）に bge-m3（1024次元）の埋め込みを保存する。
// ベクトルは JSON 文字列として受け渡し、Turso 側で FLOAT32(1024) にキャストする。
// インデックス（libsql_vector_idx）はマイグレーションSQLで手動作成する。
const float32Vector = customType<{ data: string; driverData: string }>({
	dataType() {
		return 'FLOAT32(1024)';
	}
});

export const noteEmbeddings = sqliteTable('note_embeddings', {
	noteId: text('note_id')
		.notNull()
		.primaryKey()
		.references(() => notes.id, { onDelete: 'cascade' }),
	// 埋め込みを生成したモデル（例: @cf/baai/bge-m3）。乗り換え時の再埋め込み判定に使う
	model: text('model').notNull(),
	// 埋め込み対象テキストの SHA-256（内容が変わっていなければ再計算しない）
	contentHash: text('content_hash').notNull(),
	embedding: float32Vector('embedding').notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
});
