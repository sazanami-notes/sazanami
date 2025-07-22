import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth';
import * as schema from '$lib/server/db/schema';

import { BETTER_AUTH_SECRET } from '$env/static/private';
import { db } from '$lib/server/db';


// D1のインスタンスを受け取って、authインスタンスを生成する関数を作成
export const auth = betterAuth({
		database: drizzleAdapter(db,{schema, provider: 'sqlite' }),
		emailAndPassword: { enabled: true },
		secret: BETTER_AUTH_SECRET || 'O5mYuDUIfa4su4GeYWz49Y52pv7capK9',
	});
