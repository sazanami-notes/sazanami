# APIドキュメント

## エンドポイント一覧

### ノート

#### ノート一覧取得
- **URL**: `/api/notes`
- **メソッド**: `GET`
- **認証**: 必須
- **クエリパラメータ**:
  - `search` (オプション): 検索クエリ
  - `page` (オプション): ページ番号 (デフォルト: 1)
  - `limit` (オプション): 1ページあたりの件数 (デフォルト: 20)
- **レスポンス**:
  ```json
  {
    "notes": [
      {
        "id": "string",
        "userId": "string",
        "title": "string",
        "content": "string",
        "createdAt": "timestamp",
        "updatedAt": "timestamp",
        "isPublic": "boolean",
        "tags": ["string"]
      }
    ],
    "pagination": {
      "page": "number",
      "limit": "number",
      "total": "number",
      "totalPages": "number"
    }
  }
  ```

#### ノート作成
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
    "content": "string",
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "isPublic": "boolean"
  }
  ```

#### ノート詳細取得
- **URL**: `/api/notes/{id}`
- **メソッド**: `GET`
- **認証**: 必須
- **パスパラメータ**:
  - `id`: ノートID
- **レスポンス**:
  ```json
  {
    "id": "string",
    "userId": "string",
    "title": "string",
    "content": "string",
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "isPublic": "boolean",
    "tags": ["string"]
  }
  ```

#### ノート更新
- **URL**: `/api/notes/{id}`
- **メソッド**: `PUT`
- **認証**: 必須
- **パスパラメータ**:
  - `id`: ノートID
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
    "content": "string",
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "isPublic": "boolean"
  }
  ```

#### ノート削除
- **URL**: `/api/notes/{id}`
- **メソッド**: `DELETE`
- **認証**: 必須
- **パスパラメータ**:
  - `id`: ノートID
- **レスポンス**:
  - ステータスコード: `204 No Content`

## 認証

### ログイン
- **URL**: `/api/auth/login`
- **メソッド**: `POST`
- **リクエストボディ**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **レスポンス**:
  ```json
  {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    },
    "session": {
      "id": "string",
      "expiresAt": "timestamp"
    }
  }
  ```

### ログアウト
- **URL**: `/api/auth/logout`
- **メソッド**: `POST`
- **認証**: 必須
- **レスポンス**:
  - ステータスコード: `204 No Content`

## エラーレスポンス

### 400 Bad Request
- リクエストの形式が不正な場合
```json
{
  "message": "Invalid request body"
}
```

### 401 Unauthorized
- 認証が必要なエンドポイントに認証なしでアクセスした場合
```json
{
  "message": "Unauthorized"
}
```

### 404 Not Found
- 存在しないリソースにアクセスした場合
```json
{
  "message": "Note not found"
}
```

### 500 Internal Server Error
- サーバー内部でエラーが発生した場合
```json
{
  "message": "Internal Server Error"
}
