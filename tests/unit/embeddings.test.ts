import { describe, expect, it } from 'vitest';

import {
	EMBEDDING_DIM,
	EMBEDDING_MODEL,
	embeddingText,
	hashText,
	toVectorJson
} from '../../src/lib/server/embedding-text';

describe('embeddings', () => {
	it('モデルと次元がbge-m3の想定どおり', () => {
		expect(EMBEDDING_MODEL).toBe('@cf/baai/bge-m3');
		expect(EMBEDDING_DIM).toBe(1024);
	});

	it('タイトルと本文を空行区切りで結合する', () => {
		expect(embeddingText('タイトル', '本文です')).toBe('タイトル\n\n本文です');
	});

	it('タイトルが空なら本文だけになる', () => {
		expect(embeddingText('', '本文のみ')).toBe('本文のみ');
		expect(embeddingText('   ', '本文のみ')).toBe('本文のみ');
	});

	it('両方空なら空文字', () => {
		expect(embeddingText('', '')).toBe('');
		expect(embeddingText(null, null)).toBe('');
	});

	it('長すぎるテキストは上限で切られる', () => {
		const long = 'あ'.repeat(30000);
		expect(embeddingText('', long)).toHaveLength(20000);
	});

	it('ハッシュはSHA-256のhexで安定している', async () => {
		const a = await hashText('同じ内容');
		const b = await hashText('同じ内容');
		const c = await hashText('違う内容');
		expect(a).toBe(b);
		expect(a).not.toBe(c);
		expect(a).toMatch(/^[0-9a-f]{64}$/);
	});

	it('ベクトルは小数6桁までのJSON配列文字列になる', () => {
		expect(toVectorJson([1, 0.123456789, -0.5])).toBe('[1,0.123457,-0.5]');
	});
});
