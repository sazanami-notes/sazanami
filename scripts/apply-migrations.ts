/**
 * 本番Turso向けのマイグレーション適用（drizzle-kit が使えない環境用）。
 *
 * 本番の `__drizzle_migrations` は古い履歴が欠けていて `drizzle-kit migrate` が
 * 途中で失敗するため、**適用済みファイル名を自前のstateで管理**して差分だけ当てる。
 *
 * 使い方:
 *   MIGRATION_STATE=~/.hermes/state/sazanami_prod_migrations.json \
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... \
 *   bun run scripts/apply-migrations.ts
 *
 * - state が無ければ「適用済み」とみなす初期セットを引数で渡せる（--seed 0011,0012,0013）
 * - 各ファイルは `--> statement-breakpoint` で分割して順に実行
 * - 成功したファイル名だけ state に追記（冪等）
 */
import { createClient } from '@libsql/client';
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const env =
	(globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const url = env.TURSO_DATABASE_URL;
const authToken = env.TURSO_AUTH_TOKEN;
const statePath = env.MIGRATION_STATE;

if (!url || !statePath) {
	console.error('TURSO_DATABASE_URL and MIGRATION_STATE are required');
	process.exit(1);
}

const seed = (env.MIGRATION_SEED ?? '')
	.split(',')
	.map((s) => s.trim())
	.filter(Boolean);

type State = { applied: string[] };
let state: State = { applied: [...seed] };
if (existsSync(statePath)) {
	try {
		state = JSON.parse(readFileSync(statePath, 'utf8')) as State;
	} catch {
		console.error(`invalid migration state: ${statePath}`);
		process.exit(1);
	}
}

const dir = 'drizzle';
const files = readdirSync(dir)
	.filter((f) => f.endsWith('.sql'))
	.sort();

const pending = files.filter((f) => !state.applied.includes(f));
if (pending.length === 0) {
	console.log(JSON.stringify({ applied: [], pending: 0 }));
	process.exit(0);
}

const db = createClient({ url, authToken });
const applied: string[] = [];

for (const file of pending) {
	const sqlText = readFileSync(join(dir, file), 'utf8');
	const statements = sqlText
		.split('--> statement-breakpoint')
		.map((s) => s.trim())
		.filter(Boolean);

	try {
		for (const statement of statements) {
			await db.execute(statement);
		}
	} catch (error) {
		console.error(JSON.stringify({ failed: file, error: String(error).slice(0, 300) }));
		process.exit(1);
	}

	state.applied.push(file);
	applied.push(file);
}

mkdirSync(dirname(statePath), { recursive: true });
writeFileSync(statePath, JSON.stringify(state, null, 2));
console.log(JSON.stringify({ applied, pending: pending.length - applied.length }));
