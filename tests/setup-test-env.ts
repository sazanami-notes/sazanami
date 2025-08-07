import { beforeAll, afterAll, vi } from 'vitest';
import { createTables, dropTables, db } from './setup-test-db';

// Mock the database connection for all tests
// This ensures that any import of the db connection in the app's source
// will get the in-memory test database instance.
vi.mock('$lib/server/db/connection', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        db: db, // Replace the 'db' export with our test db instance
    };
});

beforeAll(async () => {
	await createTables();
});

afterAll(async () => {
	await dropTables();
});
