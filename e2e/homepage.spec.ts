import { test, expect } from './fixtures';

test.describe('Homepage', () => {
	test('should load homepage', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('domcontentloaded');
		await expect(page.locator('body')).toBeVisible();
	});
});
