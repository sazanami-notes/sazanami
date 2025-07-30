import { db } from './setup-test-db'; // setup-test-db から db をインポート
import { notes, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';

/**
 * テストデータベースのセットアップ
 * テスト用のユーザーとノートを挿入します。
 */
export async function setupTestDB() {
  const testUserId = ulid(); // テストユーザーIDを生成

  // テストユーザーの挿入
  await db.insert(user).values({
    id: testUserId, // 生成したIDを使用
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoNothing(); // 既に存在する場合は何もしない

  // テストノートの挿入
  await db.insert(notes).values([
    {
      id: ulid(),
      userId: testUserId, // 生成したIDを使用
      title: 'Test Note 1',
      content: 'This is the content of test note 1.',
      isPublic: false,
      createdAt: new Date(2023, 0, 1, 10, 0, 0), // 2023/01/01 10:00:00
      updatedAt: new Date(2023, 0, 1, 10, 0, 0),
      slug: 'test-note-1'
    },
    {
      id: ulid(),
      userId: testUserId,
      title: 'Test Note 2',
      content: 'This is the content of test note 2.',
      isPublic: false,
      createdAt: new Date(2023, 0, 2, 10, 0, 0), // 2023/01/02 10:00:00
      updatedAt: new Date(2023, 0, 2, 10, 0, 0),
      slug: 'test-note-2'
    },
    {
      id: ulid(),
      userId: testUserId,
      title: 'Duplicate Title',
      content: 'Content for duplicate title note A.',
      isPublic: false,
      createdAt: new Date(2023, 0, 3, 10, 0, 0),
      updatedAt: new Date(2023, 0, 3, 10, 0, 0), // Oldest
      slug: 'duplicate-title'
    },
    {
      id: ulid(),
      userId: testUserId,
      title: 'Duplicate Title',
      content: 'Content for duplicate title note B.',
      isPublic: false,
      createdAt: new Date(2023, 0, 4, 10, 0, 0),
      updatedAt: new Date(2023, 0, 4, 10, 0, 0), // Middle
      slug: 'duplicate-title'
    },
    {
      id: ulid(),
      userId: testUserId,
      title: 'Duplicate Title',
      content: 'Content for duplicate title note C.',
      isPublic: false,
      createdAt: new Date(2023, 0, 5, 10, 0, 0),
      updatedAt: new Date(2023, 0, 5, 10, 0, 0), // Newest
      slug: 'duplicate-title'
    }
  ]).onConflictDoNothing();
}

/**
 * テストデータベースのクリーンアップ
 * テストで挿入されたデータを削除します。
 */
export async function teardownTestDB() {
  // テストユーザーIDはメールアドレスで検索して取得
  const testUser = await db.select({ id: user.id }).from(user).where(eq(user.email, 'test@example.com')).get();
  if (testUser) {
    await db.delete(notes).where(eq(notes.userId, testUser.id)); // テストユーザーのノートを削除
  }
  await db.delete(user).where(eq(user.email, 'test@example.com')); // テストユーザーを削除
}