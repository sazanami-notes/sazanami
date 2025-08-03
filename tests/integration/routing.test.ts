import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { setupTestDB, teardownTestDB } from '../test-utils';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { notes, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as authModule from '$lib/server/auth';
import { generateSlug } from '$lib/utils/slug';
import { load as loadUsernameNew, actions } from '../../src/routes/[username]/new/+page.server';
import { redirect, error } from '@sveltejs/kit';

// モック用の認証セッション
const mockSession = {
  user: {
    id: 'testUser1',
    email: 'test@example.com',
    name: 'testuser',
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  session: {
    id: ulid(),
    userId: 'testUser1',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1時間後
    createdAt: new Date(),
    updatedAt: new Date(),
    token: 'dummy-token',
  }
};

// RequestEventのモックを作成するヘルパー関数
const createMockRequestEvent = (params: { id?: string; slug?: string; username?: string; notetitle?: string } = {}): any => {
  return {
    params,
    locals: {
      session: mockSession.session,
      user: mockSession.user,
    },
    url: new URL(`http://localhost${params.username ? `/${params.username}` : ''}${params.notetitle ? `/${params.notetitle}` : ''}`),
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      serialize: vi.fn(),
    },
    fetch: vi.fn(),
    getClientAddress: vi.fn(() => '127.0.0.1'),
    platform: {},
    route: {
      id: params.id ? `/notes/${params.id}/${params.slug}` : '/notes/new'
    },
    setHeaders: vi.fn(),
    isDataRequest: false,
    request: {
      formData: vi.fn().mockResolvedValue(new FormData()),
      ...params
    }
  };
};

describe('New Routing Structure', () => {
  let testUserId: string;
  let testUser: any;
  let existingNote: any;

  beforeAll(async () => {
    testUserId = ulid();
    mockSession.user.id = testUserId;
    mockSession.session.userId = testUserId;
    mockSession.user.name = 'testuser';

    // テストユーザーを作成
    await db.insert(user).values({
      id: testUserId,
      email: 'test@example.com',
      name: 'testuser',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();

    testUser = await db.select().from(user).where(eq(user.id, testUserId)).get();

    // テストノートを作成
    const noteId = ulid();
    const title = 'Test New Note';
    const slug = generateSlug(title);
    
    await db.insert(notes).values({
      id: noteId,
      userId: testUserId,
      title,
      content: 'Test content',
      slug,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: false
    });

    existingNote = await db.select().from(notes).where(eq(notes.title, title)).limit(1).get();
  });

  afterAll(async () => {
    await db.delete(notes).where(eq(notes.userId, testUserId));
    await db.delete(user).where(eq(user.id, testUserId));
  });

  it('should redirect /notes/new to /{username}/new when authenticated', async () => {
    const event = createMockRequestEvent();
    event.url = new URL('http://localhost/notes/new');
    event.locals.session = mockSession.session;

    try {
      await loadUsernameNew(event as any);
    } catch (e: any) {
      expect(e.status).toBe(302);
      expect(e.location).toBe('/testuser/new');
    }
  });

  it('should create new note and redirect to /{username}/{slug}', async () => {
    const title = 'New Test Note';
    const content = '# Test Content';
    const slug = generateSlug(title);
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    
    const event = createMockRequestEvent({ username: 'testuser', notetitle: 'new' });
    event.locals.session = mockSession.session;
    event.request.formData = vi.fn().mockResolvedValue(formData);
    
    try {
      await actions.default(event as any);
    } catch (e: any) {
      expect(e.status).toBe(302);
      expect(e.location).toBe(`/testuser/${slug}`);
    }
  });

  it('should handle note creation with special characters in title', async () => {
    const title = 'Note with spaces & special chars!';
    const content = 'Content';
    const slug = generateSlug(title);
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    
    const event = createMockRequestEvent({ username: 'testuser', notetitle: 'new' });
    event.locals.session = mockSession.session;
    event.request.formData = vi.fn().mockResolvedValue(formData);
    
    try {
      await actions.default(event as any);
    } catch (e: any) {
      expect(e.status).toBe(302);
      expect(e.location).toBe(`/testuser/${slug}`);
    }
  });
});