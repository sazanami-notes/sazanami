# 貢献ガイドライン (Contributing Guidelines)

Sazanamiプロジェクトへの貢献に興味を持っていただき、ありがとうございます！
このドキュメントでは、開発環境のセットアップ方法や、Pull Requestを送る際の手順について説明します。

## 行動規範 (Code of Conduct)

本プロジェクトでは、すべての参加者が友好的で安全な環境で活動できるよう、行動規範を定めています。
コミュニティに参加する際は、差別的な発言や攻撃的な行動を慎み、互いに敬意を持って接してください。

## 開発環境のセットアップ

### 前提条件

- **Node.js**: v22以上
- **npm**: パッケージ管理に使用します（Bunは使用していません）

### セットアップ手順

1.  **リポジトリのクローン**

    ```bash
    git clone <repository-url>
    cd sazanami
    ```

2.  **依存関係のインストール**

    ```bash
    npm install
    ```

3.  **環境変数の設定**
    `.env.example`をコピーして`.env`ファイルを作成します。

    ```bash
    cp .env.example .env
    ```

    - `BETTER_AUTH_SECRET`: 任意のシークレット文字列を設定してください。
    - ローカル開発の場合: `TURSO_DATABASE_URL="file:local.db"`

4.  **データベースのセットアップ**

    ```bash
    npm run db:migrate
    ```

5.  **開発サーバーの起動**
    ```bash
    npm run dev
    ```
    ブラウザで `http://localhost:5173` にアクセスして確認します。

## 開発ガイドライン

### 技術スタック

主な技術スタックは以下の通りです。

- **Framework**: SvelteKit (Svelte 5) - **Runes (`$state`, `$effect`等) の使用を推奨**
- **UI**: Tailwind CSS v4, DaisyUI v5
- **Database**: Turso (SQLite), Drizzle ORM
- **Authentication**: Better Auth

### ディレクトリ構造

- `src/routes/`: ページとAPIエンドポイント
- `src/lib/server/db/`: データベーススキーマ (`auth-schema.ts`は自動生成のため変更注意)
- `src/lib/stores/`: グローバル状態管理

### コーディング規約 (推奨)

- **Svelte 5 Runes**: 新しいSvelte 5の記法（`$state`, `$props`）を積極的に使用してください。
- **Drizzle ORM**: クエリビルダAPIを使用し、スキーマ変更時は `schema.ts` を更新してください。
- **Lint/Format**: コミット前に `npm run lint` や `npm run format` を実行してコードを整形してください。

## 貢献プロセス

### バグ報告・機能リクエスト

Issueを作成して、バグの詳細や提案したい機能について説明してください。

### Pull Request (PR) の手順

1.  **ブランチの作成**
    作業内容に応じたブランチを作成してください（推奨）。
    - 新機能: `feat/機能名` (例: `feat/add-dark-mode`)
    - バグ修正: `fix/バグ内容` (例: `fix/login-error`)

2.  **コミットメッセージ**
    Conventional Commits の形式を推奨しています。
    - `feat: ...` (新機能)
    - `fix: ...` (バグ修正)
    - `docs: ...` (ドキュメント更新)

3.  **テストとLint**
    PRを作成する前に、以下のコマンドでエラーがないか確認してください。

    ```bash
    npm run lint
    npm run test
    ```

4.  **PRの作成**
    変更内容を明確に記述し、関連するIssueがあればリンクしてください。

皆様の貢献をお待ちしています！
