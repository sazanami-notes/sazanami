// 埋め込みの保存・検索（DB依存）。
import { sql } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { noteEmbeddings } from '$lib/server/db/schema';
import {
	EMBEDDING_MODEL,
	embedText,
	embeddingText,
	hashText,
	toVectorJson,
	type AiBinding
} from '$lib/server/embedding-text';

export {
	EMBEDDING_DIM,
	EMBEDDING_MODEL,
	embedText,
	embeddingText,
	hashText,
	toVectorJson
} from '$lib/server/embedding-text';
export type { AiBinding } from '$lib/server/embedding-text';

export type EmbeddableNote = {
	id: string;
	title?: string | null;
	content?: string | null;
};

/** 保存済みの内容ハッシュを取得（なければ null） */
export async function getStoredContentHash(noteId: string): Promise<string | null> {
	const rows = await db
		.select({ contentHash: noteEmbeddings.contentHash })
		.from(noteEmbeddings)
		.where(sql`${noteEmbeddings.noteId} = ${noteId}`)
		.limit(1);
	return rows[0]?.contentHash ?? null;
}

/**
 * ノート1件の埋め込みを更新する。内容が変わっていなければ何もしない。
 */
export async function embedAndStoreNote(
	ai: AiBinding,
	note: EmbeddableNote
): Promise<'updated' | 'unchanged' | 'empty'> {
	const text = embeddingText(note.title, note.content);
	if (!text) return 'empty';

	const hash = await hashText(text);
	const stored = await getStoredContentHash(note.id);
	if (stored === hash) return 'unchanged';

	const vector = await embedText(ai, text);
	const json = toVectorJson(vector);
	const now = Date.now();

	await db.run(sql`DELETE FROM note_embeddings WHERE note_id = ${note.id}`);
	await db.run(
		sql`INSERT INTO note_embeddings (note_id, model, content_hash, embedding, updated_at) VALUES (${note.id}, ${EMBEDDING_MODEL}, ${hash}, ${json}, ${now})`
	);

	return 'updated';
}

/**
 * 保存レスポンスを待たせずに埋め込みを走らせる。
 * Cloudflare では `platform.ctx.waitUntil` に乗せ、ローカルではそのまま実行する。
 */
export function scheduleNoteEmbedding(
	platform: App.Platform | undefined,
	note: EmbeddableNote
): void {
	const ai = platform?.env?.AI;
	if (!ai) return;

	const task = embedAndStoreNote(ai, note).catch((error) => {
		console.error('Failed to embed note:', note.id, error);
	});

	const ctx = platform as
		| {
				context?: { waitUntil?: (p: Promise<unknown>) => void };
				ctx?: { waitUntil?: (p: Promise<unknown>) => void };
		  }
		| undefined;
	if (ctx?.context?.waitUntil) {
		ctx.context.waitUntil(task);
	} else if (ctx?.ctx?.waitUntil) {
		ctx.ctx.waitUntil(task);
	}
}

export type SemanticHit = { id: string; distance: number };

/** 意味検索。クエリに近いノートIDを距離順で返す */
export async function semanticSearch(
	ai: AiBinding,
	userId: string,
	query: string,
	limit: number
): Promise<SemanticHit[]> {
	const vector = await embedText(ai, query.trim().slice(0, 2000));
	const json = toVectorJson(vector);
	// top_k は多めに取ってからユーザー・ステータスで絞る（1DB運用のため）
	const candidates = Math.min(Math.max(limit * 3, limit), 100);

	return db.all<SemanticHit>(sql`
		SELECT n.id AS id, vector_distance_cos(e.embedding, vector32(${json})) AS distance
		FROM vector_top_k('note_embeddings_vec_idx', vector32(${json}), ${candidates}) AS k
		JOIN note_embeddings e ON e.rowid = k.id
		JOIN notes n ON n.id = e.note_id
		WHERE n.user_id = ${userId}
			AND n.status NOT IN ('trash', 'box-deleted')
		ORDER BY distance ASC
		LIMIT ${limit}
	`);
}

/**
 * あるノートに意味が近いノートを返す（自分自身は除く）。
 * ノート本文をその場で埋め込んでクエリにするので、保存済みベクトルが無くても動く。
 */
export async function relatedNotes(
	ai: AiBinding,
	userId: string,
	note: EmbeddableNote,
	limit = 6
): Promise<SemanticHit[]> {
	const text = embeddingText(note.title, note.content);
	if (!text) return [];

	const vector = await embedText(ai, text);
	const json = toVectorJson(vector);
	const candidates = Math.min(Math.max(limit * 3, limit), 100);

	return db.all<SemanticHit>(sql`
		SELECT n.id AS id, vector_distance_cos(e.embedding, vector32(${json})) AS distance
		FROM vector_top_k('note_embeddings_vec_idx', vector32(${json}), ${candidates}) AS k
		JOIN note_embeddings e ON e.rowid = k.id
		JOIN notes n ON n.id = e.note_id
		WHERE n.user_id = ${userId}
			AND n.id != ${note.id}
			AND n.status NOT IN ('trash', 'box-deleted')
		ORDER BY distance ASC
		LIMIT ${limit}
	`);
}
