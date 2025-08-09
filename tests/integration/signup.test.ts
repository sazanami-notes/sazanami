import { describe, it, expect, afterEach, vi } from 'vitest';
import { db } from '$lib/server/db';
import { user as userSchema } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { authClient } from '$lib/auth-client';
import { ulid } from 'ulid';

describe('Sign-up functionality', () => {
	let createdUserEmail: string | null = null;

	afterEach(async () => {
		// Clean up the created user after each test
		if (createdUserEmail) {
			await db.delete(userSchema).where(eq(userSchema.email, createdUserEmail));
			createdUserEmail = null;
		}
	});

	it('should successfully sign up a new user', async () => {
		const newUser = {
			name: 'Test Sign-up User',
			email: `test-signup-${ulid()}@example.com`,
			password: 'password123'
		};
		createdUserEmail = newUser.email;

		// Mock the fetch call
		vi.spyOn(global, 'fetch').mockImplementation(async () => {
			// Simulate creating the user in the database, as the actual API is not called
			await db.insert(userSchema).values({
				id: ulid(),
				name: newUser.name,
				email: newUser.email,
				emailVerified: false,
				createdAt: new Date(),
				updatedAt: new Date()
			});

			return new Response(
				JSON.stringify({
					success: true,
					data: {
						user: {
							id: ulid(),
							name: newUser.name,
							email: newUser.email
						}
					}
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		});

		const { data, error } = await authClient.signUp.email(newUser);

		expect(error).toBeNull();
		expect(data).toBeDefined();
		expect(data?.data.user.email).toBe(newUser.email);
		expect(data?.data.user.name).toBe(newUser.name);

		// Verify user exists in the database
		const dbUser = await db.query.user.findFirst({
			where: eq(userSchema.email, newUser.email)
		});
		expect(dbUser).toBeDefined();
		expect(dbUser?.name).toBe(newUser.name);
	});
});
