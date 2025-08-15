from playwright.sync_api import sync_playwright, expect, Page
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Increase the default timeout for all actions
    page.set_default_timeout(10000)

    try:
        # --- Step 1: Navigate to the login page ---
        print("Navigating to login page...")
        page.goto("http://localhost:12000/login", wait_until="networkidle")
        print("URL:", page.url)

        # --- Step 2: Switch to registration ---
        print("Switching to registration mode...")
        register_tab = page.get_by_role("tab", name="新規登録")
        expect(register_tab).to_be_visible()
        register_tab.click()

        # --- Step 3: Fill out registration form ---
        print("Filling out registration form...")
        username = "jules"
        email = "jules@test.com"
        password = "password123"

        page.get_by_label("Name").fill(username)
        page.get_by_label("Email").fill(email)
        page.get_by_label("Password").fill(password)

        # --- Step 4: Submit registration ---
        print("Submitting registration...")
        page.get_by_role("button", name="登録する").click()

        # Wait for the success message to confirm registration
        print("Waiting for registration confirmation...")
        success_message = page.locator("div.alert-success")
        expect(success_message).to_be_visible()
        print("Registration successful.")

        # --- Step 5 & 6: Log in with new credentials ---
        print("Logging in...")
        # The form should now be in login mode automatically
        page.get_by_label("Email").fill(email)
        page.get_by_label("Password").fill(password)
        page.get_by_role("button", name="ログイン").click()

        # --- Step 7: Navigate to the new note page ---
        print(f"Waiting for navigation to /jules page after login...")
        # After login, it should redirect to /[username]
        expect(page).to_have_url(f"http://localhost:12000/{username}", timeout=15000)
        print("Navigation to user page successful. Now going to new note page...")

        page.goto(f"http://localhost:12000/{username}/new", wait_until="networkidle")
        print("URL:", page.url)

        # --- Step 8: Verify the editor ---
        print("Verifying Milkdown editor...")
        editor_locator = page.locator(".milkdown-editor .ProseMirror")
        expect(editor_locator).to_be_visible(timeout=15000)

        # Also check that the fallback is not there
        fallback_locator = page.locator(".fallback-textarea")
        expect(fallback_locator).not_to_be_visible()

        print("Milkdown editor loaded successfully!")

        # --- Step 9: Screenshot ---
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot saved to jules-scratch/verification/verification.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/verification-error.png")
        # Re-raise the exception to make it clear the script failed
        raise
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
