# コーディング規約

## 基本原則
常に最新のドキュメントを確認しながらコーディングをしてください。


- 可読性と保守性を重視したコードを書く。
- 一貫性のある命名規則とフォーマットを使用する。
- 不要なコードは残さず、常にクリーンな状態を保つ。
  - 特にコードを消した際に、それによって不要になった部分も消すのを忘れないでください

## コメントとドキュメント

- **最重要: 非常に詳細なコメントを記述する。** プログラミング初心者でも処理の意図や背景が理解できるように、すべてのロジックに理由を説明するコメントを付与する。
- 複雑なアルゴリズムやビジネスロジックには、特に丁寧な解説を記述する。
- すべての公開関数・メソッドには、JSDoc形式のドキュメントコメントを記述する。

## 命名規則

### 変数・関数
- `camelCase` を使用する (例: `userName`, `getUserData`)。

### 定数
- `UPPER_SNAKE_CASE` を使用する (例: `MAX_RETRY_COUNT`)。

### クラス・インターフェース
- `PascalCase` を使用する (例: `UserService`, `NoteInterface`)。

### ファイル名
- **Svelteコンポーネント:** `PascalCase.svelte` (例: `MemoCard.svelte`)
- **その他のTypeScriptファイル:** `kebab-case.ts` (例: `auth-client.ts`)

## スタイリング (Svelte)

- **Tailwind CSSを全面的に利用する。**
- **DaisyUIコンポーネントを最優先で使用する。** UI要素は可能な限りDaisyUIで構築する。
- **`<style>` タグは原則として使用しない。**
- **カラーは必ずDaisyUIのテーマカラー（`primary`, `secondary`, `accent`, `neutral`等）を使用する。** カスタムカラーは使用しない。

## Svelteコンポーネント

- `<script>` タグでは `lang="ts"` を使用してTypeScriptを有効にする。
- すべての変数、関数の引数、戻り値には型を明記する。
- ライフサイクル関数 (`onMount`, `onDestroy`など) を適切に利用する。

## TypeScript

- プロジェクト共通の型定義は `src/lib/types.ts` に集約する。
- `any` 型の使用は極力避け、具体的な型を指定する。

## データベース (Drizzle ORM)

### テーブル名
- `snake_case` の複数形を使用する (例: `notes`, `note_tags`)。

### カラム名
- `snake_case` を使用する (例: `user_id`, `created_at`)。

## APIエンドポイント

- SvelteKitのAPIルート機能を利用し、`src/routes/api/` 以下に配置する。
- RESTfulなURL設計を心がける (例: `/api/notes`, `/api/notes/{id}`)。
- レスポンスはJSON形式で返す。