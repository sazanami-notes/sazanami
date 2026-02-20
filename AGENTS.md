# Sazanami Project - AI Agent Guidelines

このドキュメントは、本プロジェクトにおいてAIエージェントが適切なコードを生成するためのガイドラインとコンテキストを提供します。

## 1. プロジェクト概要
Sazanamiは、SvelteKitを用いたメモ・Wikiアプリケーションです。リッチテキストの編集、Wikiリンク、タグ付けなどの機能を備えています。

## 2. 技術スタック
AIエージェントはコード生成の際、以下の技術スタックとバージョンを前提としてください。

- **Framework**: SvelteKit (Svelte 5) - **重要: Svelte 5 の Runes (`$state`, `$derived`, `$props`, `$effect`) を積極的に使用してください。古いSvelte 4の記法（`export let`, `$:`, `onMount`の多用など）は避けてください。**
- **Styling**: Tailwind CSS v4 + DaisyUI v5
- **Database**: Turso (SQLiteベース)
- **ORM**: Drizzle ORM (`@libsql/client` 経由)
- **Authentication**: Better Auth
- **Editor**: Tiptap (Markdownサポート拡張)
- **Testing**: Vitest, Svelte Testing Library
- **Package Manager**: npm (または bun)

## 3. ディレクトリ構造と責務
標準的なSvelteKitの構造に加え、以下のルールに従ってファイルを配置・更新してください。

- `src/routes/`: ページとAPIエンドポイント。
  - サーバーサイドの処理やDBアクセスは `+page.server.ts` または `+server.ts` に記述すること。
- `src/lib/components/`: 再利用可能なSvelteコンポーネント。UIコンポーネントはここに配置する。
- `src/lib/server/`: サーバーサイドのみで実行されるセキュアなコード。
  - `src/lib/server/db/`: データベース接続(`connection.ts`)、スキーマ定義。
    - `schema.ts`: アプリケーション固有のテーブル定義。
    - **`auth-schema.ts`: Better Auth によって自動生成・管理されるスキーマ。手動での無闇な変更は避けること。**
  - `src/lib/server/auth.ts`: Better Auth の設定とインスタンス。
- `src/lib/stores/`: グローバルな状態管理。必要に応じてSvelte 5の `$state` を用いた状態クラス・関数として実装すること。
- `tests/`: Vitestを用いたユニットテスト(`tests/unit/`)およびインテグレーションテスト(`tests/integration/`)。

## 4. コーディング規約・ベストプラクティス

### Svelte / SvelteKit
- コンポーネントのプロパティは `$props()` を使用して定義してください。
- リアクティブな状態は `$state()` を使用してください。
- 派生状態は `$derived()` を使用してください。
- クライアント・サーバー間のデータのやり取りは、適切に SvelteKit の Load 関数や Form Actions、あるいは API Routes (`+server.ts`) を使用してください。

### データベース (Drizzle ORM)
- 新しいテーブルやカラムを追加する場合は、原則として `src/lib/server/db/schema.ts` を更新してください。
- **【注意】認証関連のデータベーススキーマに関しては、Better Authの自動生成スキーマ（`src/lib/server/db/auth-schema.ts`）が存在します。データベースやスキーマの変更・マイグレーションを行う際は、このファイルとの競合や破壊が起きないよう十分に注意してください。**
- スキーマ変更後は、エージェントはユーザーに `npm run db:generate` および `npm run db:migrate` の実行を促すか、自動タスクとして実行する提案を行ってください。
- クエリを記述する際は、DrizzleのクエリビルダーAPI（`db.select().from(...)` または Relational Queries）を使用してください。

### スタイリング (Tailwind CSS + DaisyUI)
- カスタムCSSを書く前に、Tailwind CSSのユーティリティクラスで実現できないか検討してください。
- コンポーネントのUIには DaisyUI のコンポーネントクラス（例: `btn`, `card`, `input`, `modal` など）を活用して一貫性を保ってください。

### 認証 (Better Auth)
- 認証が必要なルート・APIでは、サーバーサイドでセッションを検証してください。
- ユーザー情報の取得には Better Auth のクライアント/サーバーメソッドを使用してください。

## 5. よく使うコマンド
AIエージェントがタスクを実行・提案する際は、以下のコマンドを参考にしてください。

- 開発サーバー起動: `npm run dev`
- コードフォーマット: `npm run format`
- 静的解析・Lint: `npm run lint`, `npm run check`
- テスト実行: `npm run test`
- DBマイグレーション生成: `npm run db:generate`
- DBマイグレーション適用: `npm run db:migrate`
- DB閲覧スタジオ: `npm run db:studio`