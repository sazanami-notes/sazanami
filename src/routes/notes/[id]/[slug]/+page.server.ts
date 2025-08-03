import { getNoteById } from '$lib/server/db';
import { error } from '@sveltejs/kit';

export const load = async ({ locals, params }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }
  
  try {
    const note = await getNoteById(locals.user.id, params.id);
    if (!note) {
      throw error(404, 'Note not found');
    }
    return { note };
  } catch (err) {
    throw error(500, 'Failed to load note');
  }
};