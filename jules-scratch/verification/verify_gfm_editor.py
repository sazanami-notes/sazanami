import re
from playwright.sync_api import Playwright, sync_playwright, expect


def run(playwright: Playwright) -> None:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Go to the login page
    page.goto("http://localhost:5173/login")

    # --- Sign up ---
    # Switch to register mode
    page.get_by_role("tab", name="新規登録").click()

    # Fill out the registration form
    page.get_by_label("Name").fill("testuser")
    page.get_by_label("Email").fill("test@example.com")
    page.get_by_label("Password").fill("password")

    # Click the register button
    page.get_by_role("button", name="登録する").click()

    # --- Log in ---
    # The page should now be in login mode.
    # Wait for the success message to appear and disappear
    expect(page.get_by_text("登録が完了しました。ログインしてください。")).to_be_visible()

    # Fill out the login form
    page.get_by_label("Email").fill("test@example.com")
    page.get_by_label("Password").fill("password")

    # Click the login button
    page.get_by_role("button", name="ログイン").click()

    # --- Create a new note ---
    # Wait for navigation to the user's page
    expect(page).to_have_url(re.compile(r"\/testuser$"))

    # Click the "New Note" button
    page.get_by_role("button", name="新規メモ作成").click()

    # --- Edit the note ---
    # Wait for navigation to the new note page
    expect(page).to_have_url(re.compile(r"\/testuser\/new$"))

    # Type GFM content into the editor
    editor = page.locator(".milkdown-editor")

    # Wait for the editor to be visible
    expect(editor).to_be_visible()

    gfm_content = """
# GFM Editor Test

This is a test of the GFM editor.

| Feature    | Support |
|------------|---------|
| Tables     | ✅      |
| Task Lists | ✅      |

- [x] Write a test
- [ ] Profit?
"""
    editor.fill(gfm_content)

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    # ---------------------
    context.close()
    browser.close()


with sync_playwright() as playwright:
    run(playwright)
