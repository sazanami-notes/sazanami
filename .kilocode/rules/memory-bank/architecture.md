# アーキテクチャ (Architecture)

## 概要

Sazanamiは、SvelteKitをフレームワークとして採用し、フロントエンドとバックエンドを単一のコードベースで管理するモノリシックな構成です。デプロイターゲットは、Cloudflare Pages/WorkersやNetlifyのようなサーバーレス環境を想定しています。

## ファイル構造の重要なパス

- `src/`
  - `lib/`
    - `components/`: 再利用可能なSvelteコンポーネント。
    - `server/`: サーバーサイド専用のロジック。
      - `auth.ts`: 認証関連の設定。
      - `db/`: データベース関連のコード。
        - `schema.ts`: Drizzle ORMによるデータベーススキーマ定義。
    - `types.ts`: プロジェクト全体で使われる型定義。
  - `routes/`: SvelteKitのファイルベースルーティング。
    - `api/`: RESTful APIエンドポイント。
    - `login/`: ログインページ。
  - `hooks.server.ts`: サーバーサイドのフックを定義。主に認証処理。
- `drizzle.config.ts`: Drizzle Kitの設定ファイル。
- `svelte.config.js`: SvelteKitのビルド設定。現在はCloudflare用のアダプターが設定されていますが、ホスティング環境に応じて変更可能です。

## フロントエンドアーキテクチャ

- **UIフレームワーク:** SvelteKitを利用し、UIはSvelteコンポーネントで構築されます。
- **スタイリング:** Tailwind CSSをベースにしたDaisyUIコンポーネントライブラリを使用し、迅速なUI開発を実現します。
- **状態管理:** Svelteの組み込みストア (`svelte/store`) を基本的な状態管理に使用します。
- **Markdown編集:** Milkdownライブラリを導入し、高機能なWYSIWYG Markdownエディタを提供します。

## バックエンドアーキテクチャ

- **ランタイム:** Cloudflare WorkersやNetlify Functionsのようなサーバーレス関数として構築されています。
- **API:** SvelteKitのAPIルート機能 (`src/routes/api/**/+server.ts`) を使用してRESTful APIエンドポイントを公開します。
- **データベース:**
  - **エンジン:** SQLiteを利用します。Cloudflare D1やTursoのような互換性のあるプラットフォームでの利用を想定しています。
  - **ORM:** Drizzle ORMを使用して、型安全なデータベースアクセスを実現します。マイグレーションは`drizzle-kit`で行います。
- **認証:**
  - `better-auth`ライブラリが認証ロジック全体を管理します。
  - `src/hooks.server.ts`でリクエストをインターセプトし、セッション情報を検証・付与します。
  - 認証関連のDBスキーマは`auth-schema.ts`で定義されています。

## データモデル

データベーススキーマ (`src/lib/server/db/schema.ts`) は、以下の主要なエンティティで構成されています。

- `user`: ユーザー情報
- `session`: ユーザーセッション
- `notes`: ノート本体（タイトル、内容など）
- `tags`: タグ
- `note_tags`: ノートとタグの中間テーブル
- `note_links`: ノート間のリンク関係
- `attachments`: 添付ファイル情報
- `note_attachments`: ノートと添付ファイルの中間テーブル

主キーには、ソート可能でユニークなIDとして`ULID`が採用されています。
