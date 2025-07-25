# Sazanami アーキテクチャドキュメント

## プロジェクト構造

```
sazanami/
├── src/
│   ├── app.html
│   ├── app.css
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.svelte
│   │   ├── notes/
│   │   │   ├── +page.svelte
│   │   │   ├── new/
│   │   │   │   └── +page.svelte
│   │   │   └── [id]/
│   │   │       └── +page.svelte
│   │   ├── api/
│   │   │   └── notes/
│   │   │       ├── +server.ts
│   │   │       └── [id]/
│   │   │           └── +server.ts
│   │   └── login/
│   │       └── +page.svelte
│   └── lib/
│       ├── components/
│       │   ├── MemoCard.svelte
│       │   ├── SearchBar.svelte
│       │   └── TagFilter.svelte
│       ├── server/
│       │   ├── db.ts
│       │   └── db/
│       │       └── schema.ts
│       └── types.ts
├── static/
└── docs/
```

## コンポーネント説明

### フロントエンド (SvelteKit)
- **`src/routes/`**: ページコンポーネントとAPIルートを配置
  - `+page.svelte`: ページコンポーネント
  - `+server.ts`: APIエンドポイント
- **`src/lib/components/`**: 再利用可能なUIコンポーネント
- **`src/lib/types.ts`**: TypeScriptの型定義

### バックエンド (APIサーバー)
- **`src/routes/api/`**: APIエンドポイントの実装
  - ノートのCRUD操作
  - 認証関連の処理

### データベース
- **`src/lib/server/db/`**: データベース接続とスキーマ定義
  - Drizzle ORMを使用してSQLiteデータベースとやり取り

### 認証
- **`src/lib/server/auth.ts`**: 認証ロジックの実装
- **`auth-schema.ts`**: 認証関連テーブルのスキーマ定義

## データフロー

1. ユーザーがブラウザでアプリケーションにアクセス
2. SvelteKitがページコンポーネントをレンダリング
3. ページコンポーネントがAPIエンドポイントにリクエストを送信
4. APIエンドポイントがデータベースからデータを取得または更新
5. データベースが結果を返す
6. APIエンドポイントがレスポンスを返す
7. ページコンポーネントがレスポンスを受信してUIを更新

## 技術スタック

- **フロントエンド**: SvelteKit, Tailwind CSS, DaisyUI
- **バックエンド**: SvelteKitサーバーモジュール
- **データベース**: SQLite (Turso), Drizzle ORM
- **認証**: better-auth
- **Markdownエディタ**: Milkdown
