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
export const extractWikiLinks = (contentHtml: string | null | undefined): string[] => {
	if (!contentHtml) return [];
	// エスケープされた \[\[ も考慮する
	const regex = /\\?\[\\?\[(.*?)\\?\]\\?\]/g;
	const matches = [...contentHtml.matchAll(regex)];
	if (!matches.length) return [];
	// グループ1 (タイトル部分) を抽出
	return matches.map((match) => match[1]);
};

/**
 * Markdownコンテンツ内の [[Title]] 構文を実際のリンク（HTML）に変換する。
 * @param content Markdownコンテンツ
 * @param resolvedLinks 解決済みリンクのマップ (JSON文字列またはオブジェクト)
 * @returns 変換後のHTML文字列
 */
export function renderWikiLinks(contentHtml: string | null | undefined, resolvedLinks: any): string {
	if (!content) return '';

	let linksMap: Record<string, string> = {};
	if (typeof resolvedLinks === 'string') {
		try {
			linksMap = JSON.parse(resolvedLinks);
		} catch (e) {
			console.error('Failed to parse resolvedLinks:', e);
		}
	} else if (resolvedLinks && typeof resolvedLinks === 'object') {
		linksMap = resolvedLinks;
	}

	// キーをすべて小文字に変換（Case-insensitive用）
	const normalizedMap: Record<string, string> = {};
	for (const [key, value] of Object.entries(linksMap)) {
		normalizedMap[key.toLowerCase()] = value;
	}

	// [[Title]] または \[\[Title\]\] を置換
	return content.replace(/\\?\[\\?\[(.*?)\\?\]\\?\]/g, (match, title) => {
		const targetId = normalizedMap[title.toLowerCase()];
		if (targetId) {
			// 解決済み: IDへのリンク
			return `<a href="/home/note/${targetId}" class="wiki-link" data-wiki-link="resolved">${title}</a>`;
		} else {
			// 未解決: スタイルのみ適用（または特殊なリンク）
			return `<span class="wiki-link-unresolved" data-wiki-link="unresolved">${title}</span>`;
		}
	});
}
