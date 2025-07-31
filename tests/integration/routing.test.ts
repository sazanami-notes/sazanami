import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { setupTestDB, teardownTestDB } from '../test-utils';
import { ulid } from 'ulid';
import { db } from '$lib/server/db';
import { notes, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as authModule from '$lib/server/auth';
import { generateSlug } from '$lib/utils/slug';
import { load } from '../../src/routes/notes/[id]/[slug]/+page.server';
import { redirect, error } from '@sveltejs/kit';

// モック用の認証セッション
const mockSession = {
  user: {
    id: 'testUser1',
    email: 'test@example.com',
    name: 'Test User',
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
const createMockRequestEvent = (params: { id: string; slug: string }): any => {
  return {
    params,
    locals: {
      session: mockSession.session,
      user: mockSession.user,
    },
    url: new URL(`http://localhost/notes/${params.id}/${params.slug}`),
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
      id: '/notes/[id]/[slug]'
    },
    setHeaders: vi.fn(),
    isDataRequest: false,
  };
};

describe('SvelteKit Routing /notes/[id]/[slug]', () => {
  let testUserId: string;

  beforeAll(async () => {
    testUserId = ulid();
    mockSession.user.id = testUserId;
    mockSession.session.userId = testUserId;

    await db.insert(user).values({
      id: testUserId,
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();

    await db.insert(notes).values([
      {
        id: ulid(),
        userId: testUserId,
        title: 'Existing Note',
        content: 'Content of existing note.',
        isPublic: false,
        createdAt: new Date(2023, 0, 1, 10, 0, 0),
        updatedAt: new Date(2023, 0, 1, 10, 0, 0),
        slug: 'existing-note'
      },
    ]).onConflictDoNothing();
  });

  afterAll(async () => {
    await db.delete(notes).where(eq(notes.userId, testUserId));
    await db.delete(user).where(eq(user.id, testUserId));
  });

  it('should throw 404 error if note not found', async () => {
    const nonExistentId = ulid();
    const params = { id: nonExistentId, slug: 'any-slug' };
    const event = createMockRequestEvent(params);

    await expect(load(event as any)).rejects.toThrow('Note not found');
  });

  it('should return note data if slug matches', async () => {
    // データベースから既存のノートを取得
    const existingNote = await db.select().from(notes).where(eq(notes.title, 'Existing Note')).limit(1).get();
    if (!existingNote) {
      throw new Error('Test note not found in database');
    }

    const params = { id: existingNote.id, slug: existingNote.slug };
    const event = createMockRequestEvent(params);

    const result = await load(event as any);
    expect(result.note.id).toBe(existingNote.id);
    expect(result.note.title).toBe(existingNote.title);
    expect(result.note.slug).toBe(existingNote.slug);
  });

  it('should redirect if slug does not match', async () => {
    // データベースから既存のノートを取得
    const existingNote = await db.select().from(notes).where(eq(notes.title, 'Existing Note')).limit(1).get();
    if (!existingNote) {
      throw new Error('Test note not found in database');
    }

    const params = { id: existingNote.id, slug: 'wrong-slug' };
    const event = createMockRequestEvent(params);

    try {
      await load(event as any);
      // リダイレクトが発生しなかった場合、テストは失敗する
      expect(true).toBe(false);
    } catch (e: any) {
      // SvelteKitのredirectは特殊なオブジェクトをthrowする
      expect(e.status).toBe(301);
      expect(e.location).toBe(`/notes/${existingNote.id}/${existingNote.slug}`);
    }
  });
});