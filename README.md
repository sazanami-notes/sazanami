[![Netlify Status](https://api.netlify.com/api/v1/badges/72ee93dc-8b78-473a-a461-0b68bed0dca4/deploy-status)](https://app.netlify.com/projects/sazanami/deploys)

# Sazanami

Sazanamiは「Markdownで書けるScrapbox」を基本コンセプトとした、おひとり様用のノートテイキングアプリです。Obsidianの複雑さ、Notionの動作の遅さ、Scrapboxの独自フォーマットといった課題を解決し、Markdownによるポータビリティと、素早いメモ書きの体験を提供することを目指しています。

- [Figma](https://www.figma.com/design/GmQwVZtxtMtLhujgtrmGYl/sazanami?node-id=0-1&t=isQ1ILUFBDQy9zg5-1)
- [Notion](https://kaedesato.notion.site/Sazanami-21c1121f1cf680c39412f1039f155707?pvs=74)

> [!WARNING]
> Ver1.0.0までは破壊的変更を頻繁に行います。

## 主要機能

- **Markdownファースト:** すべてのノートはMarkdownで記述されます。
- **SNSライクなメモ機能:** タイムライン形式で素早くアイデアを書き留められます。
- **ビジュアルな整理:** Google Keepのようにノートを視覚的に整理できます。
- **双方向リンク:** `[[Wikiリンク]]`でノート間のリンクを簡単に作成できます。
- **タグシステム:** タグを使ってノートを柔軟に整理・検索できます。
- **リマインダー機能:** 特定のノートにリマインダーを設定できます。
- **添付ファイル:** ノートにファイルや画像を追加できます。

## 技術スタック

- **Framework**: [SvelteKit](https://kit.svelte.dev/)
- **UI**: [Tailwind CSS](https://tailwindcss.com/), [daisyUI](https://daisyui.com/)
- **Bundler**: [Vite](https://vitejs.dev/)
- **Database ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Database**: [@libsql/client](https://github.com/tursodatabase/libsql-client-ts) (local, with SQLite), [Turso](https://turso.tech/) (production)
- **Markdown Editor**: [Tiptap](https://tiptap.dev/) (with Yjs for real-time collaboration)
- **Testing**: [Vitest](https://vitest.dev/)

## クイックスタート

1.  **リポジトリをクローン**

    ```bash
    git clone <repository-url>
    cd sazanami
    ```

2.  **依存関係をインストール**

    ```bash
    bun install
    ```

3.  **環境変数を設定**
    `.env.example`をコピーして`.env`ファイルを作成し、環境変数を設定します。

    ```bash
    cp .env.example .env
    ```

    最低限、`BETTER_AUTH_SECRET`に適当なシークレット文字列を設定してください。ローカルで開発する場合は、`.env`ファイルに`TURSO_DATABASE_URL="file:local.db"`のように設定します。

4.  **データベースをマイグレーション**

    ```bash
    bun run db:migrate
    ```

5.  **開発サーバーを起動**
    ```bash
    bun run dev
    ```
    ブラウザで `http://localhost:5173` にアクセスします。

## リアルタイム共同編集（Hocuspocus）- 任意

Hocuspocus を起動すると、複数ユーザーによるリアルタイム共同編集（カーソル共有、同時編集）が有効になります。**設定しなくてもエディタは通常通り動作します。**

### セットアップ

1.  **Hocuspocus サーバーをクローン**
    ```bash
    git clone <hocuspocus-repo-url> sazanami-hocuspocus
    cd sazanami-hocuspocus
    ```

2.  **依存関係をインストールして起動**
    ```bash
    bun install
    bun run dev
    ```
    デフォルトでは `ws://localhost:1234` で起動します。

3.  **Sazanami 側の環境変数（デフォルトのままなら不要）**

    `.env` に以下を追加：
    ```env
    PUBLIC_HOCUSPOCUS_URL=ws://localhost:1234
    ```

Hocuspocus を起動していない場合、TiptapEditor はローカルの IndexedDB のみで動作し、共同編集機能は無効になります。起動すれば透過的に共同編集が有効になります。

## テスト

### ユニットテスト

```bash
bun run test:unit
```

### E2Eテスト (Playwright)

実際のブラウザ（Chromium）を使用した統合テスト。
ログインからノート作成、編集までの重要なユーザーフローを検証。

```bash
# E2Eテスト実行
bun run test:e2e

# UIモード（ブラウザ表示）
bun run test:e2e:ui

# デバッグモード
bun run test:e2e:debug
```

**テスト対象機能**:
- 認証（ログイン/登録）
- ノート作成（タイムライン/Box）
- ノート編集（テキスト入力、タスクリスト、フォーマット）
- Wikiリンク
- 検索
- タグ機能
- アーカイブ/削除

### 全テスト実行

```bash
bun run test
```
