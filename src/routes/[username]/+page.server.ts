import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/connection';
import { notes, noteTags, tags } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ request, params }) => {
  const sessionData = await auth.api.getSession({
    headers: request.headers
  });

  if (!sessionData?.session) {
    throw redirect(302, '/login');
  }

  // Ensure the username in the URL matches the logged-in user
  if (params.username !== sessionData.user.name) {
    throw redirect(302, `/${sessionData.user.name}`);
  }

  // Fetch notes for this user
  const userNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, sessionData.user.id))
    .orderBy(desc(notes.updatedAt));

  // Fetch all tags for the user
  const userTagsResult = await db
    .selectDistinct({ name: tags.name })
    .from(tags)
    .innerJoin(noteTags, eq(tags.id, noteTags.tagId))
    .innerJoin(notes, eq(noteTags.noteId, notes.id))
    .where(eq(notes.userId, sessionData.user.id));

  const allTags = userTagsResult.map(t => t.name);

  return {
    notes: userNotes,
    allTags,
    user: sessionData.user
  };
};