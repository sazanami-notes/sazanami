import { db } from '$lib/server/db/connection';
import { user } from '$lib/server/db/auth-schema';
import { auth } from '$lib/server/auth';
import { eq } from 'drizzle-orm';

const TEST_EMAIL = 'e2e-test@example.com';
const TEST_PASSWORD = 'E2eTestPass123!';
const TEST_NAME = 'E2E Test User';

async function seedTestUser() {
	const existing = await db.query.user.findFirst({
		where: eq(user.email, TEST_EMAIL)
	});

	if (!existing) {
		const { data, error } = await auth.api.signUpEmail({
			body: {
				email: TEST_EMAIL,
				password: TEST_PASSWORD,
				name: TEST_NAME
			}
		} as any);

		if (error) {
			console.error('Failed to create test user:', error);
			process.exit(1);
		}

		console.log('Test user created:', data?.user?.id);
	} else {
		console.log('Test user already exists:', existing.id);
	}
}

seedTestUser().catch(console.error);
