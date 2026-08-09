import { beforeAll, afterAll, vi } from 'vitest';
import { createTables, dropTables, db } from './setup-test-db';

// テストではローカルストレージとnoopメールを使用
// （CI環境には.envがないため、デフォルトのs3ドライバーになるとBucket未設定で失敗する）
process.env.STORAGE_DRIVER = 'local';
process.env.EMAIL_DRIVER = 'noop';

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
	Object.defineProperty(globalThis, 'window', {
		value: {
			location: {
				origin: 'http://localhost:12000'
			}
		},
		configurable: true
	});
}
