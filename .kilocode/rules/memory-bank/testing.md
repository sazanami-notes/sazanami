# テスト戦略

## テストの種類

### ユニットテスト

- 個々の関数やコンポーネントの動作を検証する
- データベース操作やAPI呼び出しをモックする
- テストフレームワーク: Vitest
- モックライブラリ: @vitest/mock

### インテグレーションテスト

- 複数のコンポーネントやモジュールの連携を検証する
- データベースとのやり取りを検証する
- APIエンドポイントの動作を検証する
- テストフレームワーク: Vitest

### E2Eテスト

- ユーザーの操作フロー全体を検証する
- ブラウザ上で実際にアプリケーションを操作してテストする
- テストフレームワーク: Playwright

## テストディレクトリ構造

```
sazanami/
├── src/
│   └── (アプリケーションコード)
├── tests/
│   ├── unit/
│   │   ├── lib/
│   │   └── routes/
│   ├── integration/
│   │   ├── lib/
│   │   └── routes/
│   └── e2e/
│       ├── pages/
│       └── specs/
└── package.json
```

## ユニットテストの実施方法

1. テスト対象のモジュールをインポートする
2. 必要に応じてモックを作成する
3. テストケースを記述する
4. 期待する結果と実際の結果を比較する

例:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getNoteById } from '../src/lib/server/db';

// モックの作成
vi.mock('../src/lib/server/db', () => ({
	getNoteById: vi.fn()
}));

describe('getNoteById', () => {
	it('should return a note when given a valid id', async () => {
		// モックの戻り値を設定
		(getNoteById as vi.Mock).mockResolvedValue({
			id: '1',
			title: 'Test Note',
			content: 'This is a test note.'
		});

		const note = await getNoteById('1');
		expect(note).toEqual({
			id: '1',
			title: 'Test Note',
			content: 'This is a test note.'
		});
	});
});
```

## インテグレーションテストの実施方法

1. テスト用のデータベースをセットアップする
2. テストデータを挿入する
3. APIエンドポイントを呼び出す
4. レスポンスを検証する
5. テストデータをクリーンアップする

例:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../src/app';
import { setupTestDB, teardownTestDB } from './test-utils';

describe('GET /api/notes', () => {
	beforeAll(async () => {
		await setupTestDB();
	});

	afterAll(async () => {
		await teardownTestDB();
	});

	it('should return a list of notes', async () => {
		const response = await app.request('/api/notes');
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(Array.isArray(data.notes)).toBe(true);
	});
});
```

## E2Eテストの実施方法

1. Playwrightのテストファイルを作成する
2. ブラウザを起動する
3. ページにアクセスする
4. ユーザー操作をシミュレートする
5. ページの状態を検証する
6. ブラウザを終了する

例:

```typescript
import { test, expect } from '@playwright/test';

test('should create a new note', async ({ page }) => {
	// ログインページにアクセス
	await page.goto('/login');

	// ログイン情報を入力
	await page.fill('input[name="email"]', 'test@test.com');
	await page.fill('input[name="password"]', 'testtest');
	await page.click('button[type="submit"]');

	// ノート一覧ページに遷移
	await page.goto('/notes');

	// 新規ノート作成ボタンをクリック
	await page.click('button:has-text("新規メモ作成")');

	// ノート情報を入力
	await page.fill('input[name="title"]', 'Test Note');
	await page.fill('textarea[name="content"]', 'This is a test note.');
	await page.click('button[type="submit"]');

	// ノートが作成されたことを確認
	await expect(page.locator('h1:has-text("Test Note")')).toBeVisible();
});
```

## テストの実行方法

### すべてのテストを実行

```bash
npm run test
```

### ユニットテストのみ実行

```bash
npm run test:unit
```

### インテグレーションテストのみ実行

```bash
npm run test:integration
```

### E2Eテストのみ実行

```bash
npm run test:e2e
```

## テストカバレッジ

- 目標: 全体のテストカバレッジを80%以上にする
- テストカバレッジの計測: `npm run test:coverage`
- 重要なビジネスロジックやエラーハンドリングは必ずテストする

## CI/CDでのテスト実行

- GitHub Actionsでプルリクエストごとに自動テストを実行
- メインブランチへのマージ前にすべてのテストがパスすることを確認
- テストが失敗した場合はマージをブロックする
