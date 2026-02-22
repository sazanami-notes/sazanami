import { beforeAll, afterAll, vi } from 'vitest';
import { createTables, dropTables, db } from './setup-test-db';

// Mock the database connection for all tests
// This ensures that any import of the db connection in the app's source
// will get the in-memory test database instance.
// We are providing a direct mock implementation instead of using a factory
// to avoid importing the original module, which would cause a crash because
// the environment variables are not set in the test environment.
vi.mock('$lib/server/db/connection', () => {
	return {
		db: db // Replace the 'db' export with our test db instance
	};
});

beforeAll(async () => {
	await createTables();
});

afterAll(async () => {
	await dropTables();
});

// Mock location for better-auth client in Node environment
if (typeof window === 'undefined') {
	(global as any).window = {
		location: {
			origin: 'http://localhost:12000'
		}
	};
}
