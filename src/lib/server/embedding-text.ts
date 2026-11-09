// 埋め込みの純粋な部分（DBに依存しない）。
// Workers AI の bge-m3 呼び出しと、テキスト正規化・ハッシュ・JSON化だけを持つ。

export const EMBEDDING_MODEL = '@cf/baai/bge-m3';
export const EMBEDDING_DIM = 1024;
/** 1ノートあたりの埋め込み対象文字数の上限（60kトークン上限に対する安全弁） */
export const MAX_CHARS = 20000;

export type AiBinding = NonNullable<App.Platform['env']['AI']>;

/** 埋め込み対象テキスト（タイトル＋本文）を組み立てる */
export function embeddingText(title?: string | null, content?: string | null): string {
	const text = [(title ?? '').trim(), (content ?? '').trim()].filter(Boolean).join('\n\n');
	return text.slice(0, MAX_CHARS);
}

/** SHA-256（hex）。内容が変わったかの判定に使う */
export async function hashText(text: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 1件のテキストを埋め込む */
export async function embedText(ai: AiBinding, text: string): Promise<number[]> {
	const result = (await ai.run(EMBEDDING_MODEL, { text: [text] })) as
		{ data?: number[][] } | undefined;
	const vector = result?.data?.[0];
	if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIM) {
		throw new Error(`unexpected embedding response (dim=${vector?.length ?? 'none'})`);
	}
	return vector;
}

/** Turso に渡すベクトル表現（JSON配列文字列） */
export function toVectorJson(vector: number[]): string {
	return `[${vector.map((v) => Number(v.toFixed(6))).join(',')}]`;
}
