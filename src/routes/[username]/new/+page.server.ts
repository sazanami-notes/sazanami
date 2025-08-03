import { redirect, type RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notes, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { generateSlug } from '$lib/utils/slug';

export const load = async ({ locals }: RequestEvent) => {
  if (!locals.session) {
    throw redirect(302, '/login');
  }
  return { initialContent: '# New Note' };
};

export const actions = {
  default: async ({ request, locals }: RequestEvent) => {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const userId = locals.session?.userId;
    
    if (!userId) {
      throw redirect(302, '/login');
    }
    
    // ユーザー名を取得
    const [userData] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId));
      
    if (!userData) {
      throw redirect(302, '/login');
    }
    
    const slug = generateSlug(title);
    const newNoteId = ulid();
    
    await db.insert(notes).values({
      id: newNoteId,
      userId,
      title,
      content,
      slug,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: false
    });
    
    return redirect(302, `/${userData.name}/${slug}`);
  }
};