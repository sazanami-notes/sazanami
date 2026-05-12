import { test, expect } from './fixtures';

test.describe('Note Creation', () => {
	test('should create note via editor', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/home/note/new');
		await authenticatedPage.waitForLoadState('networkidle');
		await authenticatedPage.waitForTimeout(1000);

		const editor = authenticatedPage.locator('[contenteditable="true"]').first();
		await editor.type('Hello', { timeout: 10000 });
		await authenticatedPage.waitForTimeout(2000);

		await expect(authenticatedPage.url()).toMatch(/\/home\/note\//);
	});

	test('should create box note', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/home/note/new?status=box');
		await authenticatedPage.waitForLoadState('networkidle');
		await authenticatedPage.waitForTimeout(1000);

		const titleInput = authenticatedPage.locator('input').first();
		await titleInput.type('Box E2E Test', { timeout: 10000 });

		const editor = authenticatedPage.locator('[contenteditable="true"]').first();
		await editor.type('Box content', { timeout: 10000 });
		await authenticatedPage.waitForTimeout(2000);

		await expect(authenticatedPage.url()).toMatch(/\/home\/note\//);
	});
});
