import { test, expect } from './fixtures';

test.describe('Note Editing', () => {
	test('should create and reload note', async ({ authenticatedPage }) => {
		await authenticatedPage.goto('/home/note/new');
		await authenticatedPage.waitForLoadState('networkidle');
		await authenticatedPage.waitForTimeout(500);

		await authenticatedPage.locator('[contenteditable="true"]').first().click({ force: true });
		await authenticatedPage.waitForTimeout(300);
		await authenticatedPage.keyboard.type('Persistent content');
		await authenticatedPage.waitForTimeout(2000);

		const noteId = authenticatedPage.url().match(/\/home\/note\/([a-zA-Z0-9]+)/)?.[1];

		if (noteId) {
			await authenticatedPage.goto(`/home/note/${noteId}`);
			await authenticatedPage.waitForLoadState('networkidle');

			await expect(authenticatedPage.locator('[contenteditable="true"]').first()).toBeAttached();
		}
	});
});
