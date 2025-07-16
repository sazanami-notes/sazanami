import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/better-sqlite3"; // ここを変更
import Database from "better-sqlite3"; // これを追加

// CLIでのスキーマ生成のために、ダミーのDrizzleインスタンスを作成します。
// 実際のデータベース接続は必要ありません。
const dummyClient = new Database(":memory:"); // ダミーのインメモリDB
const dummyDb = drizzle(dummyClient);

export const auth = betterAuth({
  database: drizzleAdapter(dummyDb, {
    provider: "sqlite", // Cloudflare D1はSQLite互換です
  }),
  // Better Authの必須設定
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || "your_super_secret_key_for_cli", // CLI用のダミーシークレット
  emailAndPassword: { enabled: true },
}); 