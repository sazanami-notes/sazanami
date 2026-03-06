import type { Note } from '$lib/types';
import { generateSlug } from '$lib/utils/slug';

export type SortKey = 'updatedAt_desc' | 'updatedAt_asc' | 'createdAt_desc' | 'createdAt_asc' | 'title_asc' | 'title_desc';

export function sortNotes(notes: Note[], sortKey: SortKey): Note[] {
	const sorted = [...notes];
	switch (sortKey) {
		case 'updatedAt_desc':
			return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
		case 'updatedAt_asc':
			return sorted.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
		case 'createdAt_desc':
			return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		case 'createdAt_asc':
			return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
		case 'title_asc':
			return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ja'));
		case 'title_desc':
			return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'ja'));
		default:
			return sorted;
	}
}

// ノートの詳細ページへのURLを生成する関数
export function getNoteDetailUrl(note: Note, username: string): string {
	return `/${username}/${generateSlug(note.title)}`;
}

// ノートのコンテンツからWikiリンク（例: [[Page Title]]）を抽出する関数
export const extractWikiLinks = (content: string | null | undefined): string[] => {
	if (!content) return [];
	const regex = /\[\[(.*?)\]\]/g;
	const matches = content.match(regex);
	if (!matches) return [];
	// "[[Page Title]]" から "Page Title" を抽出して返す
	return matches.map((match) => match.slice(2, -2));
};
