import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { load as loadNotesIdSlug } from '../../src/routes/notes/[id]/[slug]/+page.server';
import { load as loadUsernameNotetitle } from '../../src/routes/[username]/[notetitle]/+page.server';
import { actions as usernameNewActions } from '../../src/routes/[username]/new/+page.server';
import { setupTestDB, teardownTestDB } from '../setup-test-db';
import { createTestUser } from '../test-utils';

describe('Routing', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('should load note detail page', async () => {
    const { name } = await createTestUser();
    const result = await loadNotesIdSlug({
      params: { id: '1', slug: 'test-note' },
      locals: { user: { id: '1', name } }
    } as any);
    expect(result).toHaveProperty('note');
  });

  it('should load note detail by username and title', async () => {
    const { name } = await createTestUser();
    const result = await loadUsernameNotetitle({
      params: { username: name, notetitle: 'test-note' },
      locals: { user: { id: '1', name } }
    } as any);
    expect(result).toHaveProperty('note');
  });

  it('should create a new note', async () => {
    const { name } = await createTestUser();
    const formData = new FormData();
    formData.append('title', 'Test Note');
    formData.append('content', 'Test Content');

    const result = await usernameNewActions.default({
      request: { formData: () => Promise.resolve(formData) } as any,
      locals: { user: { id: '1', name } } as any
    } as any);

    expect(result).toHaveProperty('success', true);
  });

  it('should redirect to user page after successful login', async () => {
    const { email, password, name } = await createTestUser();
    
    // ログインリクエストを送信
    const response = await fetch('/api/auth/email/sign-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    expect(response.status).toBe(200);
    
    // セッションクッキーが正しいパスで設定されていることを確認
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toContain('Path=/');
    
    // ログイン成功後のリダイレクト処理を確認
    const homeResponse = await fetch('/', { redirect: 'manual' });
    expect(homeResponse.status).toBe(302);
    expect(homeResponse.headers.get('Location')).toBe(`/${name}`);
  });
});
