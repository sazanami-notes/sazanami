import { beforeAll, afterAll } from 'vitest';
import { createTables, dropTables, db } from './setup-test-db'; // createTables と dropTables をインポート

beforeAll(async () => {
	await createTables();
});

afterAll(async () => {
	await dropTables();
});
