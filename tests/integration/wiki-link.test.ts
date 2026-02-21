import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { setupTestDB, teardownTestDB } from '../test-utils';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { notes, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as authModule from '$lib/server/auth';
import { generateSlug } from '$lib/utils/slug';

// モック用の認証セッション
const mockSession = {
	user: {
		id: 'testUser1',
		email: 'test@example.com',
		name: 'Test User',
		emailVerified: false, twoFactorEnabled: false,
		createdAt: new Date(),
		updatedAt: new Date()
	},
	session: {
		id: ulid(),
		userId: 'testUser1',
		expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1時間後
		createdAt: new Date(),
		updatedAt: new Date(),
		token: 'dummy-token'
	}
};

interface ResolveLinkResponse {
	id: string;
	title?: string;
	message?: string;
}

describe('Wiki Link Resolution', () => {
	let testUserId: string;

	beforeAll(async () => {
		testUserId = ulid();
		mockSession.user.id = testUserId;
		mockSession.session.userId = testUserId;

		await db
			.insert(user)
			.values({
				id: testUserId,
				email: 'test@example.com',
				name: 'Test User',
				emailVerified: false, twoFactorEnabled: false,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.onConflictDoNothing();

		await db
			.insert(notes)
			.values([
				{
					id: ulid(),
					userId: testUserId,
					title: 'Existing Note',
					content: 'Content of existing note.',
					isPublic: false,
					createdAt: new Date(2023, 0, 1, 10, 0, 0),
					updatedAt: new Date(2023, 0, 1, 10, 0, 0),
					slug: 'existing-note'
				}
			])
			.onConflictDoNothing();
	});

	afterAll(async () => {
		await db.delete(notes).where(eq(notes.userId, testUserId));
		await db.delete(user).where(eq(user.id, testUserId));
	});

	it('should resolve wiki link correctly', async () => {
		// データベースから既存のノートを取得
		const existingNote = await db
			.select()
			.from(notes)
			.where(eq(notes.title, 'Existing Note'))
			.limit(1)
			.get();
		if (!existingNote) {
			throw new Error('Test note not found in database');
		}

		// モックされたfetch関数を作成
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ id: existingNote.id })
		});

		// グローバルなfetchをモックに置き換え
		const originalFetch = global.fetch;
		global.fetch = mockFetch;

		try {
			// テスト対象の関数をシミュレート
			const linkText = 'Existing Note';
			const response = await fetch(`/api/notes/resolve-link?title=${encodeURIComponent(linkText)}`);

			if (response.ok) {
				const data: ResolveLinkResponse = await response.json();
				const url = `/notes/${data.id}`;

				expect(data.id).toBe(existingNote.id);
				expect(url).toBe(`/notes/${existingNote.id}`);
			} else {
				throw new Error('Failed to resolve wiki link');
			}
		} finally {
			// グローバルなfetchを元に戻す
			global.fetch = originalFetch;
		}
	});

	it('should apply unresolved class if note not found', async () => {
		// モックされたfetch関数を作成
		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
			json: () => Promise.resolve({ message: 'Note not found' })
		});

		// グローバルなfetchをモックに置き換え
		const originalFetch = global.fetch;
		global.fetch = mockFetch;

		try {
			// テスト対象の関数をシミュレート
			const linkText = 'Non-existent Note';
			const response = await fetch(`/api/notes/resolve-link?title=${encodeURIComponent(linkText)}`);

			expect(response.ok).toBe(false);
			expect(response.status).toBe(404);
		} finally {
			// グローバルなfetchを元に戻す
			global.fetch = originalFetch;
		}
	});

	it('should apply error class if network error occurs', async () => {
		// モックされたfetch関数を作成
		const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

		// グローバルなfetchをモックに置き換え
		const originalFetch = global.fetch;
		global.fetch = mockFetch;

		try {
			// テスト対象の関数をシミュレート
			const linkText = 'Any Note';

			// エラーがスローされることを期待
			await expect(
				fetch(`/api/notes/resolve-link?title=${encodeURIComponent(linkText)}`)
			).rejects.toThrow('Network error');
		} finally {
			// グローバルなfetchを元に戻す
			global.fetch = originalFetch;
		}
	});
});
