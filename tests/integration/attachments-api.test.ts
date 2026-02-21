import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { attachments, user as userSchema } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as authModule from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import type { User, Session } from 'better-auth';
import { POST } from '../../src/routes/api/attachments/+server';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.resolve(process.cwd(), 'static/uploads');

// Mock user and session
const testUser = {
	id: ulid(),
	name: 'attachmentuser',
	email: 'attachmentuser@example.com'
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
	// Clean up any old test files before starting
	try {
		await fs.rm(UPLOAD_DIR, { recursive: true, force: true });
	} catch {
		// ignore
	}
});

afterAll(async () => {
	await db.delete(attachments).where(eq(attachments.userId, testUser.id));
	await db.delete(userSchema).where(eq(userSchema.id, testUser.id));
	// Clean up test files after finishing
	try {
		await fs.rm(UPLOAD_DIR, { recursive: true, force: true });
	} catch {
		// ignore
	}
});

describe('POST /api/attachments', () => {
	it('should upload a file, save metadata, and return the URL', async () => {
		// 1. Create a mock file
		const fileContent = 'This is a test file.';
		const fileName = 'test-file.txt';
		const file = new File([fileContent], fileName, { type: 'text/plain' });

		// 2. Create FormData
		const formData = new FormData();
		formData.append('file', file);

		// 3. Create mock request
		const request = new Request('http://localhost/api/attachments', {
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
		expect(body.url).toMatch(/\/uploads\/[0-9A-HJKMNP-TV-Z]{26}\.txt/);

		// 6. Verify database record
		const dbRecord = await db.query.attachments.findFirst({
			where: eq(attachments.filePath, body.url)
		});

		expect(dbRecord).toBeDefined();
		expect(dbRecord?.fileName).toBe(fileName);
		expect(dbRecord?.mimeType).toBe('text/plain');
		expect(dbRecord?.fileSize).toBe(fileContent.length);
		expect(dbRecord?.userId).toBe(testUser.id);

		// 7. Verify file exists on filesystem
		const uploadedFilePath = path.join(process.cwd(), 'static', dbRecord!.filePath);
		const fileExists = await fs
			.access(uploadedFilePath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists, 'Uploaded file should exist').toBe(true);
	});

	it('should return 401 if user is not authenticated', async () => {
		vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValue(null);

		const request = new Request('http://localhost/api/attachments', { method: 'POST' });
		const event = { request } as unknown as RequestEvent;

		const response = await POST(event);
		expect(response.status).toBe(401);
	});
});
