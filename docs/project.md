# Sazanami プロジェクト概要

## プロジェクト概要
Sazanamiは、MarkdownでかけるScrapBoxを基本コンセプトとしたノートテイキングアプリです。
現在はVer.0.1.0ラインの開発中で、おひとり様Scrapboxを作ることを目標としています。

## 技術スタック
- **フレームワーク**: SvelteKit
- **データベース**: Drizzle ORM, SQLite (Turso)
- **認証**: better-auth
- **Markdownエディタ**: Milkdown
- **スタイリング**: Tailwind CSS, DaisyUI

## 実装状況

### ノート一覧表示機能
- ノートの一覧表示、検索、タグフィルター、ページネーションが実装されています。
- APIからノートデータを取得して表示しています。

### 新規ノート作成機能
- Milkdownを使用したMarkdownエディタが実装されています。
- タイトル、内容、タグの入力と保存機能が実装されています。
- APIエンドポイント`/api/notes`にPOSTリクエストを送信してノートを作成しています。

### APIエンドポイント
- GETリクエストでノートの一覧を取得する機能が実装されています。
- POSTリクエストで新しいノートを作成する機能が実装されています。
- ノートとタグの関連付けも実装されています。

### データベーススキーマ
- `notes`, `tags`, `note_tags`, `note_links`, `attachments`, `note_attachments`などのテーブルが定義されています。
- 認証関連のテーブル（`user`, `session`, `account`, `verification`）も定義されています。
