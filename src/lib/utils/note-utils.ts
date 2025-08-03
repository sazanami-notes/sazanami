import type { Note } from '$lib/types';
import { generateSlug } from '$lib/utils/slug';

// ノートの詳細ページへのURLを生成する関数
export function getNoteDetailUrl(note: Note, username: string): string {
  return `/${username}/${encodeURIComponent(note.title)}`;
}