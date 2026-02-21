import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { notes, noteLinks, user as userSchema } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import * as authModule from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import type { User, Session } from 'better-auth';
import { POST } from '../../src/routes/api/notes/import/+server';

// Mock user and session
const testUser = {
	id: ulid(),
	name: 'importuser',
	email: 'importuser@example.com'
};

const mockSession = {
	user: { ...testUser, emailVerified: true, twoFactorEnabled: false, createdAt: new Date(), updatedAt: new Date() } as User,
	session: {
		id: ulid(),
		userId: testUser.id,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60),
		createdAt: new Date(),
		updatedAt: new Date(),
		token: 'dummy-token'
	} as Session
};

beforeAll(async () => {
	await db.insert(userSchema).values({
		id: testUser.id,
		name: testUser.name,
		email: testUser.email,
		emailVerified: true
	});
});

afterAll(async () => {
	await db.delete(noteLinks).where(sql`1=1`);
	await db.delete(notes).where(eq(notes.userId, testUser.id));
	await db.delete(userSchema).where(eq(userSchema.id, testUser.id));
});

describe('POST /api/notes/import', () => {
	it('should import multiple markdown files, create notes, and parse links', async () => {
		// 1. Create mock files
		const file1Content = 'This is the first file.';
		const file1 = new File([file1Content], 'First File.md', { type: 'text/markdown' });

		const file2Content = 'This file links to [[First File]].';
		const file2 = new File([file2Content], 'Second File.md', { type: 'text/markdown' });

		// 2. Create FormData
		const formData = new FormData();
		formData.append('files', file1);
		formData.append('files', file2);

		// 3. Create mock request
		const request = new Request('http://localhost/api/notes/import', {
			method: 'POST',
			body: formData
		});

		const event = {
			request,
			locals: { user: mockSession.user, session: mockSession.session }
		} as unknown as RequestEvent;

		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValue(mockSession);

		// 4. Call the endpoint handler
		const response = await POST(event);
		const body = await response.json();

		// 5. Assert response
		expect(response.status).toBe(201);
		expect(body.success).toBe(true);
		expect(body.importedCount).toBe(2);

		// 6. Verify notes in DB
		const importedNotes = await db.select().from(notes).where(eq(notes.userId, testUser.id));
		expect(importedNotes).toHaveLength(2);

		const note1 = importedNotes.find((n) => n.title === 'First File');
		const note2 = importedNotes.find((n) => n.title === 'Second File');

		expect(note1).toBeDefined();
		expect(note2).toBeDefined();
		expect(note1?.content).toBe(file1Content);
		expect(note2?.content).toBe(file2Content);

		// 7. Verify link was created in DB
		if (!note1 || !note2) {
			throw new Error('Test notes were not created');
		}

		const links = await db.select().from(noteLinks).where(eq(noteLinks.sourceNoteId, note2.id));

		expect(links).toHaveLength(1);
		expect(links[0].targetNoteId).toBe(note1.id);
	});
});
