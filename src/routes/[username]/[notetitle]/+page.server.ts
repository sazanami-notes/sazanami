import { error } from '@sveltejs/kit';
import { getNoteByTitle } from '$lib/server/db';

export const load = async ({ params, locals }) => {
  const { username, notetitle } = params;
  const title = decodeURIComponent(notetitle);
  const note = await getNoteByTitle(username, title, locals.session?.user?.id);
  
  if (!note) {
    throw error(404, 'Note not found');
  }
  
  return { note };
};