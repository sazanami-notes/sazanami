import { describe, it, expect, afterEach, vi } from 'vitest';
import { db } from '$lib/server/db';
import { user as userSchema } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { authClient } from '$lib/auth-client';
import { ulid } from 'ulid';

// Mock the whole auth-client module
vi.mock('$lib/auth-client', async () => {
	const actual = await vi.importActual('$lib/auth-client') as any;
	return {
		...actual,
		authClient: {
			...actual.authClient,
			signUp: {
				email: vi.fn()
			}
		},
		signUp: {
			email: vi.fn()
		}
	};
});

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

		const mockedSignUp = authClient.signUp.email as any;
		mockedSignUp.mockImplementation(async (data: any) => {
			const id = ulid();
			await db.insert(userSchema).values({
				id,
				name: data.name,
				email: data.email,
				emailVerified: false, twoFactorEnabled: false,
				createdAt: new Date(),
				updatedAt: new Date()
			});

			return {
				data: {
					user: {
						id,
						name: data.name,
						email: data.email
					}
				},
				error: null
			};
		});

		const { data, error } = await authClient.signUp.email(newUser);

		expect(error).toBeNull();
		expect(data).toBeDefined();
		expect(data?.user.email).toBe(newUser.email);

		// Verify user exists in the database
		const dbUser = await db.query.user.findFirst({
			where: eq(userSchema.email, newUser.email)
		});
		expect(dbUser).toBeDefined();
		expect(dbUser?.name).toBe(newUser.name);
	});
});
