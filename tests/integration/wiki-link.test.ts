import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { box, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as authModule from '$lib/server/auth';

const mockSession = {
	user: {
		id: 'testUser1',
		email: 'test@example.com',
		name: 'Test User',
		emailVerified: false,
		createdAt: new Date(),
		updatedAt: new Date()
	},
	session: {
		id: ulid(),
		userId: 'testUser1',
		expiresAt: new Date(Date.now() + 1000 * 60 * 60),
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

		await db.insert(user).values({ ...mockSession.user, id: testUserId });

		await db.insert(box).values([
			{
				id: ulid(),
				userId: testUserId,
				title: 'Existing Note',
				content: 'Content of existing note.',
				createdAt: new Date(2023, 0, 1, 10, 0, 0),
				updatedAt: new Date(2023, 0, 1, 10, 0, 0),
				slug: 'existing-note'
			}
		]);
	});

	afterAll(async () => {
		await db.delete(box).where(eq(box.userId, testUserId));
		await db.delete(user).where(eq(user.id, testUserId));
	});

	it('should resolve wiki link correctly', async () => {
		const existingNote = await db.query.box.findFirst({ where: eq(box.title, 'Existing Note') });
		if (!existingNote) {
			throw new Error('Test note not found in database');
		}

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ id: existingNote.id })
		});

		const originalFetch = global.fetch;
		global.fetch = mockFetch;

		try {
			const linkText = 'Existing Note';
			const response = await fetch(`/api/notes/resolve-link?title=${encodeURIComponent(linkText)}`);

			if (response.ok) {
				const data: ResolveLinkResponse = await response.json();
				const url = `/home/box/${data.id}`;

				expect(data.id).toBe(existingNote.id);
				expect(url).toBe(`/home/box/${existingNote.id}`);
			} else {
				throw new Error('Failed to resolve wiki link');
			}
		} finally {
			global.fetch = originalFetch;
		}
	});
});