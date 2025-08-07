# Sazanami

Sazanamiは「Markdownで書けるScrapbox」を基本コンセプトとした、おひとり様用のノートテイキングアプリです。Obsidianの複雑さ、Notionの動作の遅さ、Scrapboxの独自フォーマットといった課題を解決し、Markdownによるポータビリティと、素早いメモ書きの体験を提供することを目指しています。

- [Figma](https://www.figma.com/design/GmQwVZtxtMtLhujgtrmGYl/sazanami?node-id=0-1&t=isQ1ILUFBDQy9zg5-1)

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
- **Markdown Editor**: [Milkdown](https://milkdown.dev/)
- **Testing**: [Vitest](https://vitest.dev/)

## クイックスタート

1.  **リポジトリをクローン**
    ```bash
    git clone <repository-url>
    cd sazanami
    ```

2.  **依存関係をインストール**
    ```bash
    npm install
    ```

3.  **環境変数を設定**
    `.env.example`をコピーして`.env`ファイルを作成し、環境変数を設定します。
    ```bash
    cp .env.example .env
    ```
    最低限、`BETTER_AUTH_SECRET`に適当なシークレット文字列を設定してください。ローカルで開発する場合は、`.env`ファイルに`TURSO_DATABASE_URL="file:local.db"`のように設定します。

4.  **データベースをマイグレーション**
    ```bash
    npm run db:migrate
    ```

5.  **開発サーバーを起動**
    ```bash
    npm run dev
    ```
    ブラウザで `http://localhost:5173` にアクセスします。

## テスト

ユニットテストを実行します。
```bash
npm run test:unit
```

全てのテストを実行します。
```bash
npm run test
```

## 詳細ドキュメント

より詳細な情報については、以下のドキュメントを参照してください。

- **[プロジェクト概要](./.kilocode/rules/memory-bank/product.md)**
- **[アーキテクチャ](./.kilocode/rules/memory-bank/architecture.md)**
- **[開発セットアップ](./.kilocode/rules/memory-bank/setup.md)**
- **[コーディング規約](./.kilocode/rules/memory-bank/tech.md)**
- **[API仕様](./.kilocode/rules/memory-bank/api.md)**
- **[テスト戦略](./.kilocode/rules/memory-bank/testing.md)**
- **[デプロイ手順](./.kilocode/rules/memory-bank/deployment.md)**
