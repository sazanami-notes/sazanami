# Sazanami API v1（契約）

最終更新: 2026-11-09

外部クライアント（MCP・スクリプト・将来のモバイルアプリ）向けの公開API。
実装は `src/routes/api/v1/**`。認証は `src/lib/server/api-auth.ts`。

## 認証

```
Authorization: Bearer sznm_xxxxxxxx
```

- 個人アクセストークン（`api_tokens` テーブルにSHA-256で保存）
- スコープ: `read` / `write`（カンマ区切りで複数）
- ブラウザからのセッションCookieでも動く（内部利用・スコープは read+write）
- トークン管理（`/api/tokens`）は**セッションのみ**許可。トークンでは管理できない

## 共通

- ベースパス: `/api/v1`
- エラー: `{ "error": { "code": "not_found", "message": "..." } }`
- CORS: `*`（`access-control-allow-origin: *`）、`OPTIONS` は 204
- 日時: ISO 8601 文字列
- すべての操作は認証ユーザーのノートに限定される（他人のノートは404）

### ノートの形

完全形（`note`）:

```json
{
	"id": "01J...",
	"title": "タイトル",
	"slug": "title-abc123",
	"content": "# Markdown",
	"status": "box",
	"isPublic": false,
	"isPinned": false,
	"parentId": null,
	"context": null,
	"createdAt": "2026-11-09T03:00:00.000Z",
	"updatedAt": "2026-11-09T03:00:00.000Z",
	"resolvedLinks": {},
	"tags": ["tag1"]
}
```

一覧用（`noteSummary`）= `note` から `content` を除き、`excerpt`（本文先頭200文字・改行は空白化）を足したもの。

## エンドポイント

### `GET /api/v1/health`（認証不要）

`{ "ok": true, "version": "v1" }`

### `GET /api/v1/me`（read）

`{ "user": { "id", "name", "username", "image" } }`

### `GET /api/v1/notes`（read）

クエリ:

- `status`: カンマ区切り（`inbox,box,archived,trash,box-archived,box-deleted`）。既定は **`box-deleted` を除く全部**
- `q`: タイトル・本文の部分一致
- `tag`: タグ名
- `limit`: 既定20・最大100
- `offset`: 既定0
- `sort`: `updated`（既定） | `created` | `title`
- `order`: `desc`（既定） | `asc`
- `include`: `content` を指定した時だけ本文を含む

レスポンス: `{ "notes": [noteSummary], "total": 123, "limit": 20, "offset": 0 }`

### `POST /api/v1/notes`（write）

ボディ:

```json
{
	"title": "任意",
	"content": "任意",
	"status": "inbox|box|...",
	"isPublic": false,
	"parentId": null,
	"tags": ["a"]
}
```

- `title` 省略時 `Untitled Note`、`status` 省略時 `inbox`
- `slug` は自動生成（`$lib/utils/slug` の `generateSlug`）
- 保存後に `updateNoteLinks` でリンク解決
- `parentId` は同一ユーザーのノートのみ許可（違反は400）

レスポンス: 201 `{ "note": note }`

### `GET /api/v1/notes/{id}`（read）

`{ "note": note }`

### `PUT /api/v1/notes/{id}`（write）

ボディ（部分更新・指定したフィールドだけ更新）:
`title` / `content` / `status` / `isPublic` / `isPinned` / `context`

- `title` 変更時は `updateBacklinksOnTitleChange` を呼ぶ
- `title` / `content` 変更時は `updateNoteLinks` を呼ぶ
- 何も変わらなければ200で現状を返す
- `updatedAt` は更新時のみ更新

レスポンス: `{ "note": note }`

### `DELETE /api/v1/notes/{id}`（write）

- 既定: ゴミ箱へ移動（`status = 'trash'`）
- `?permanent=true`: 完全削除（`deleteNote`）

レスポンス: `{ "id": "...", "deleted": true, "permanent": false }`

### `GET /api/v1/search?q=...`（read）

クエリ: `q`（必須）, `limit`（既定20・最大100）, `offset`, `status`（既定は `trash` と `box-deleted` を除外）

レスポンス: `{ "notes": [noteSummary], "total": 1, "q": "..." }`

### `GET /api/v1/notes/{id}/links`（read）

`{ "oneHopLinks": [noteSummary], "backlinks": [noteSummary], "twoHopLinks": [noteSummary] }`

## レート制限

未実装（TODO）。トークン単位の `lastUsedAt` のみ記録している。
外部公開時はCloudflareのRate Limitingバインディングを付ける。

## 実装メモ

- 認証: `getPrincipal(request)` → `{ userId, scopes, tokenId? }`
- スコープ判定: `hasScope(principal, 'write')`
- レスポンス: `apiJson` / `apiError` / `preflight`（`$lib/server/api-response`）
- 既存のセッション用API（`/api/notes`）はそのまま残す。v1は別実装（内部UIを壊さない）
