import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import { BETTER_AUTH_SECRET } from '$env/static/private';


// D1のインスタンスを受け取って、authインスタンスを生成する関数を作成
export const createAuth = (d1: D1Database) => {
	const db = drizzle(d1, { schema });

	// betterAuthの設定をここにまとめる
	const authConfig = {
		database: drizzleAdapter(db, { provider: 'sqlite' }),
		emailAndPassword: { enabled: true },
        secret: BETTER_AUTH_SECRET || "O5mYuDUIfa4su4GeYWz49Y52pv7capK9",
	} satisfies BetterAuthOptions;

	return betterAuth(authConfig);
};