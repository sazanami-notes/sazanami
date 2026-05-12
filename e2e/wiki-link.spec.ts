import { test, expect } from './fixtures';

test.describe('Wiki Link', () => {
	test('should type wiki link syntax', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/home/note/new');
		await authenticatedPage.waitForLoadState('networkidle');
		await authenticatedPage.waitForTimeout(1000);

		const editor = authenticatedPage.locator('[contenteditable="true"]').first();
		await editor.type('[[TestLink]]', { timeout: 10000 });

		await authenticatedPage.waitForTimeout(1000);
		await expect(editor).toContainText('TestLink');
	});
});
