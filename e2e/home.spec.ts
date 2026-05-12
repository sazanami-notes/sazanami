import { test, expect } from './fixtures';

test.describe('Home Page', () => {
	test('should display authenticated home', async ({ authenticatedPage }) => {
		await expect(authenticatedPage.locator('h1, h2, main').first()).toBeVisible({ timeout: 15000 });
	});

	test('should navigate to box', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/home/box');
		await authenticatedPage.waitForLoadState('networkidle');
		await expect(authenticatedPage.url()).toContain('/home/box');
	});
});
