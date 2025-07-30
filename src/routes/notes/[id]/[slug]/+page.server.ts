import { redirect, error } from '@sveltejs/kit';
import { generateSlug } from '$lib/utils/slug';
import { getNoteById } from '$lib/server/db';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
  const noteId = params.id;
  const requestedSlug = params.slug;

  const note = await getNoteById(noteId);

  if (!note) {
    error(404, 'Note not found');
  }

  const generatedSlug = generateSlug(note.title);

  if (requestedSlug !== generatedSlug) {
    redirect(301, `/notes/${note.id}/${generatedSlug}`);
  }

  return {
    note: {
      ...note,
      content: note.content // Markdown形式のコンテンツをそのまま返す
    }
  };
}