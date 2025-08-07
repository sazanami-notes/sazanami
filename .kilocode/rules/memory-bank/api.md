# APIドキュメント

## エンドポイント一覧

### ノート一覧取得

- **URL**: `/api/notes`
- **メソッド**: `GET`
- **認証**: 必須
- **クエリパラメータ**:
  - `search` (string, optional): 検索キーワード
  - `page` (integer, optional, default: 1): ページ番号
  - `limit` (integer, optional, default: 20): 1ページあたりの件数
- **レスポンス**:
  ```json
  {
  	"notes": [
  		{
  			"id": "string",
  			"userId": "string",
  			"title": "string",
  			"content": "string (Markdown形式)",
  			"createdAt": "timestamp",
  			"updatedAt": "timestamp",
  			"isPublic": "boolean",
  			"tags": ["string"]
  		}
  	],
  	"pagination": {
  		"page": "integer",
  		"limit": "integer",
  		"total": "integer",
  		"totalPages": "integer"
  	}
  }
  ```

### ノート作成

- **URL**: `/api/notes`
- **メソッド**: `POST`
- **認証**: 必須
- **リクエストボディ**:
  ```json
  {
  	"title": "string",
  	"content": "string",
  	"tags": ["string"]
  }
  ```
- **レスポンス**:
  ```json
  {
  	"id": "string",
  	"userId": "string",
  	"title": "string",
  	"content": "string (Markdown形式)",
  	"createdAt": "timestamp",
  	"updatedAt": "timestamp",
  	"isPublic": "boolean"
  }
  ```

### ノート詳細取得

- **URL**: `/api/notes/{id}`
- **メソッド**: `GET`
- **認証**: 必須
- **パスパラメータ**:
  - `id` (string): ノートID
- **レスポンス**:
  ```json
  {
  	"id": "string",
  	"userId": "string",
  	"title": "string",
  	"content": "string (Markdown形式)",
  	"createdAt": "timestamp",
  	"updatedAt": "timestamp",
  	"isPublic": "boolean",
  	"tags": ["string"]
  }
  ```

### ノート更新

- **URL**: `/api/notes/{id}`
- **メソッド**: `PUT`
- **認証**: 必須
- **パスパラメータ**:
  - `id` (string): ノートID
- **リクエストボディ**:
  ```json
  {
  	"title": "string",
  	"content": "string",
  	"tags": ["string"]
  }
  ```
- **レスポンス**:
  ```json
  {
  	"id": "string",
  	"userId": "string",
  	"title": "string",
  	"content": "string (Markdown形式)",
  	"createdAt": "timestamp",
  	"updatedAt": "timestamp",
  	"isPublic": "boolean",
  	"tags": ["string"]
  }
  ```

### ノート削除

- **URL**: `/api/notes/{id}`
- **メソッド**: `DELETE`
- **認証**: 必須
- **パスパラメータ**:
  - `id` (string): ノートID
- **レスポンス**:
  - `204 No Content` (成功時)
