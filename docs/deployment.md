# デプロイ手順

## デプロイ先

- **フロントエンド**: Cloudflare Pages
- **バックエンド**: Cloudflare Workers (SvelteKitのadapter-cloudflareを使用)
- **データベース**: Turso (SQLite)

## 環境変数

デプロイ時には以下の環境変数を設定する必要があります:

- `DATABASE_URL`: Tursoデータベースの接続URL
- `AUTH_SECRET`: 認証用のシークレトキー
- `AUTH_TRUST_HOST`: 信頼するホスト (例: `https://your-app.cloudflare.pages.dev`)

## デプロイ手順

### 1. ビルド

ローカルでアプリケーションをビルドします:

```bash
npm run build
```

### 2. Cloudflare Pagesへのデプロイ

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)にログインします。
2. 「Workers & Pages」セクションに移動します。
3. 「Create application」をクリックし、「Pages」を選択します。
4. GitHubリポジトリを接続します。
5. 以下の設定を行います:
   - **Project name**: `sazanami`
   - **Production branch**: `main`
   - **Framework preset**: `SvelteKit`
   - **Root directory**: `/`
   - **Build command**: `npm run build`
   - **Build output directory**: `.svelte-kit/cloudflare`
6. 環境変数を設定します:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_TRUST_HOST`
7. 「Save and Deploy」をクリックします。

### 3. Tursoデータベースのセットアップ

1. [Turso CLI](https://docs.turso.tech/reference/turso-cli)をインストールします。
2. 以下のコマンドでデータベースを作成します:
   ```bash
   turso db create sazanami
   ```
3. データベースのURLを取得します:
   ```bash
   turso db show sazanami --url
   ```
4. データベースの認証トークンを生成します:
   ```bash
   turso db tokens create sazanami
   ```
5. 取得したURLとトークンをCloudflare Pagesの環境変数`DATABASE_URL`に設定します。

### 4. データベーススキーマのマイグレーション

1. ローカルでマイグレーションファイルを生成します:
   ```bash
   npm run db:generate
   ```
2. マイグレーションファイルをリポジトリにコミットします。
3. Cloudflare Pagesのデプロイ時に自動的にマイグレーションが実行されます。

## カスタムドメインの設定

1. Cloudflare Dashboardでドメインを追加します。
2. DNS設定でCNAMEレコードを追加します:
   - **Name**: `sazanami` (または希望のサブドメイン)
   - **Target**: `sazanami.your-subdomain.pages.dev`
3. SSL/TLS暗号化モードを「Full」に設定します。

## モニタリングとロギング

- Cloudflare Analyticsを使用してトラフィックを監視します。
- ログの詳細な分析には、Cloudflare Logpushを設定します。

## バックアップとリストア

### バックアップ

1. Turso CLIを使用してデータベースのバックアップを作成します:
   ```bash
   turso db export sazanami backup.sql
   ```

### リストア

1. 新しいデータベースを作成します:
   ```bash
   turso db create sazanami-restore
   ```
2. バックアップファイルからデータをインポートします:
   ```bash
   turso db import sazanami-restore backup.sql
   ```

## トラブルシューティング

### デプロイが失敗する場合

- ビルドログを確認してエラーの原因を特定します。
- 環境変数が正しく設定されているか確認します。
- `npm run build`をローカルで実行して、同じエラーが発生するか確認します。

### アプリケーションが正しく動作しない場合

- ブラウザの開発者ツールでコンソールエラーやネットワークエラーを確認します。
- Cloudflare Pagesの関数ログを確認します。
- データベース接続が正常に行えているか確認します。
