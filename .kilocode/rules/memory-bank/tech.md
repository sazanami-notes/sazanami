# 技術スタック (Tech Stack)

## フロントエンド

- **フレームワーク:** [SvelteKit](https://svelte.dev/llms-full.txt)
- **言語:** [TypeScript](https://www.typescriptlang.org/), HTML, CSS
- **UIコンポーネント:** [DaisyUI](https://daisyui.com/llms.txt) (Tailwind CSSベース)
- **CSSフレームワーク:** [Tailwind CSS](https://tailwindcss.com/)
- **Markdownエディタ:** [Milkdown](https://milkdown.dev/)
- **Wikiリンク処理:** [remark-wiki-link](https://github.com/landakram/remark-wiki-link) (Milkdownプラグインとして統合)

## バックエンド

- **ランタイム:** [Cloudflare Workers](https://workers.cloudflare.com/) (svelte.config.jsより)
- **言語:** [TypeScript](https://www.typescriptlang.org/)
- **データベース:** [SQLite](https://www.sqlite.org/index.html) (better-sqlite3, libsql/client)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **認証:** [better-auth](https://www.better-auth.com/llms.txt)

## 開発ツール

- **ビルドツール:** [Vite](https://vitejs.dev/)
- **パッケージマネージャー:** [npm](https://www.npmjs.com/)
- **リンター:** [ESLint](https://eslint.org/)
- **フォーマッター:** [Prettier](https://prettier.io/)
- **データベースマイグレーション:** [Drizzle Kit](https://orm.drizzle.team/drizzle-kit/overview)
- **シェル:** Git Bash (Windows環境での利用を想定)

## デプロイメント

- **ホスティング:** [Cloudflare Pages](https://pages.cloudflare.com/) (adapter-cloudflareより)

## コーディング規約

プロジェクトの一貫性を保つため、以下の主要な規約を定めています。詳細は [`docs/coding-standards.md`](docs/coding-standards.md) を参照してください。

- **命名規則:**
  - 変数/関数: `camelCase`
  - 定数: `UPPER_SNAKE_CASE`
  - クラス/インターフェース: `PascalCase`
  - ファイル名: コンポーネントは `PascalCase.svelte`、その他は `kebab-case.ts`
- **スタイリング:**
  - Tailwind CSSクラスを全面的に利用します。
  - DaisyUIコンポーネントとテーマカラー（primary, secondaryなど）を最優先で使用します。
  - `<style>` タグやカスタムカラーの使用は原則禁止です。
- **データベース:**
  - テーブル名: `snake_case`（複数形）
  - カラム名: `snake_case`
- **コメント:**
  - プログラミング初心者でも理解できるよう、すべての処理に理由を説明する詳細なコメントを推奨しています。
