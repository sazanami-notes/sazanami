# 開発環境セットアップガイド

## 必要なツール

- Node.js (v18以上)
- npm (v9以上)
- Git

## セットアップ手順

1. リポジトリをクローンします:

   ```bash
   git clone git@kaede:sazanami-notes/sazanami.git
   cd sazanami
   ```

2. 依存関係をインストールします:

   ```bash
   npm install
   ```

3. 環境変数ファイルを作成します:

   ```bash
   cp .env.example .env
   ```

   `.env`ファイルを編集して、必要な環境変数を設定してください。

4. データベースのマイグレーションを実行します:

   ```bash
   npm run db:migrate
   ```

5. 開発サーバーを起動します:

   ```bash
   npm run dev
   ```

6. ブラウザで `http://localhost:5173` にアクセスします。

## 環境変数

- `DATABASE_URL`: データベースの接続URL
- `AUTH_SECRET`: 認証用のシークレットキー
- `AUTH_TRUST_HOST`: ホストの信頼設定 (例: `http://localhost:5173`)

## トラブルシューティング

### npm install でエラーが発生する場合

- Node.jsのバージョンを確認してください。
- `node --version` でバージョンを確認し、v18以上であることを確認してください。

### データベース接続でエラーが発生する場合

- `.env`ファイルの`DATABASE_URL`が正しいか確認してください。
- データベースが正しく起動しているか確認してください。

### 開発サーバーが起動しない場合

- ポート5173が他のプロセスで使用されていないか確認してください。
- `lsof -i :5173` (macOS/Linux) または `netstat -ano | findstr :5173` (Windows) で確認できます。
