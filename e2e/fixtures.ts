import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = 'test0000';

type Fixtures = {
	authenticatedPage: Page;
};

export const test = base.extend<Fixtures>({
	authenticatedPage: async ({ page }, use) => {
		await page.goto('/login');
		await page.waitForLoadState('networkidle');
		await page.click('button:has-text("パスワードでログイン")');
		await page.waitForTimeout(500);

		await page.fill('input[name="email"]', 'e2e@test.com');
		await page.fill('input[name="password"]', 'test0000');
		await page.click('button[type="submit"]');
		
		const isHome = await page.waitForURL('/home', { timeout: 5000 }).then(() => true).catch(() => false);
		
		if (!isHome) {
			await page.goto('/login?mode=register');
			await page.waitForLoadState('networkidle');
			await page.click('button:has-text("パスワードで登録")');
			await page.waitForTimeout(500);

			await page.fill('input[name="name"]', 'E2E Test');
			await page.fill('input[name="email"]', 'e2e@test.com');
			await page.fill('input[name="password"]', 'test0000');
			await page.click('button[type="submit"]');
			await page.waitForTimeout(2000);

			await page.goto('/login');
			await page.waitForLoadState('networkidle');
			await page.click('button:has-text("パスワードでログイン")');
			await page.waitForTimeout(500);

			await page.fill('input[name="email"]', 'e2e@test.com');
			await page.fill('input[name="password"]', 'test0000');
			await page.click('button[type="submit"]');

			await page.waitForURL('/home', { timeout: 15000 });
		}

		await use(page);
	}
});

export { expect };
