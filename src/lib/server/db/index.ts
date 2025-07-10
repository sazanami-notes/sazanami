import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

/**
 * D1の接続オブジェクトを受け取って、
 * Drizzleのインスタンスを生成する関数。
 * SvelteKitのサーバーサイドのコード（load関数など）で使います。
 * @param d1 - Cloudflareから提供されるD1データベースの接続オブジェクト
 * @returns Drizzleのインスタンス
 */
export const createDb = (d1: D1Database) => {
	return drizzle(d1, { schema });
};
