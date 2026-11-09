/**
 * 既存ノートの本文を走査して note_attachments を埋める（バックフィル）。
 *
 * 使い方:
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... bun run scripts/backfill-note-attachments.ts
 *   （ローカルは .env の file:local.db をそのまま使える）
 *
 * /uploads のアクセス制御は note_attachments を見るため、この紐付けが無いと
 * 既存の画像が404になる。デプロイ前に一度だけ実行する（冪等）。
 */
import { createClient } from '@libsql/client';

// tsconfig の types は workers-types のみなので process は globalThis 経由で読む
const env =
	(globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const url = env.TURSO_DATABASE_URL;
const authToken = env.TURSO_AUTH_TOKEN;
if (!url) {
	console.error('TURSO_DATABASE_URL is required');
	process.exit(1);
}

const UPLOAD_PATH_RE = /\/uploads\/([0-9A-HJKMNP-TV-Z]{26})\.(?:png|jpe?g|gif|webp|avif)/gi;

function extractIds(content: string): string[] {
	const ids = new Set<string>();
	for (const m of content.matchAll(UPLOAD_PATH_RE)) ids.add(m[1]);
	return [...ids];
}

const db = createClient({ url, authToken });

const notes = await db.execute(
	"SELECT id, user_id, content FROM notes WHERE content LIKE '%/uploads/%'"
);

let linked = 0;
let missing = 0;

for (const row of notes.rows) {
	const noteId = String(row.id);
	const userId = String(row.user_id);
	const content = String(row.content ?? '');

	for (const attachmentId of extractIds(content)) {
		const found = await db.execute({
			sql: 'SELECT id FROM attachments WHERE id = ? AND user_id = ?',
			args: [attachmentId, userId]
		});
		if (found.rows.length === 0) {
			missing++;
			continue;
		}
		await db.execute({
			sql: `INSERT INTO note_attachments (note_id, attachment_id)
			      SELECT ?, ? WHERE NOT EXISTS (
			        SELECT 1 FROM note_attachments WHERE note_id = ? AND attachment_id = ?
			      )`,
			args: [noteId, attachmentId, noteId, attachmentId]
		});
		linked++;
	}
}

console.log(JSON.stringify({ notes: notes.rows.length, linked, missing }, null, 0));
