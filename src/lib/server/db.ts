import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { notes, user } from './db/schema';
import { eq, and } from 'drizzle-orm';

const client = createClient({ url: process.env.DATABASE_URL! });
export const db = drizzle(client, { schema: { notes, user } });

export const getNoteById = async (id: string, userId: string | undefined) => {
  return await db.query.notes.findFirst({
    where: and(eq(notes.id, id), eq(notes.userId, userId!)),
    with: {
      tags: {
        with: {
          tag: true
        }
      }
    }
  });
};

export const getNoteByTitle = async (username: string, title: string, userId: string | undefined) => {
  // ユーザー名からユーザーIDを取得
  const userRecord = await db.query.user.findFirst({
    where: eq(user.name, username)
  });

  if (!userRecord) {
    return null;
  }

  // タイトルとユーザーIDでノートを検索
  return await db.query.notes.findFirst({
    where: and(
      eq(notes.title, title),
      eq(notes.userId, userRecord.id)
    ),
    with: {
      tags: {
        with: {
          tag: true
        }
      }
    }
  });
};
