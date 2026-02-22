import type { Note } from '$lib/types';
import { generateSlug } from '$lib/utils/slug';

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
