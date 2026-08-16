// src/lib/utils/note-embeds.ts
// ノート本文中の埋め込み（![[ノートタイトル]]）を、WikiLink解決と競合しないように
// 保護→復元するユーティリティ。MemoCard / TimelinePost 等で共通利用する。

export interface EmbedPlaceholder {
	placeholder: string;
	title: string;
}

function escapeMarkdownText(value: string) {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/\]/g, '\\]')
		.replace(/\(/g, '\\(')
		.replace(/\)/g, '\\)');
}

/**
 * 本文中の `![[タイトル]]` を一時プレースホルダーに置き換える。
 * その後 renderWikiLinks などで `[[...]]` を処理しても、`![[...]]` が
 * 先頭の `!` だけ残る問題を防げる。
 */
export function protectNoteEmbeds(content: string): { contentHtml: string; embeds: EmbedPlaceholder[] } {
	const embeds: EmbedPlaceholder[] = [];
	const protectedContent = content.replace(/!\[\[(.*?)\]\]/g, (_match, title) => {
		const placeholder = `__SAZANAMI_NOTE_EMBED_${embeds.length}__`;
		embeds.push({ placeholder, title });
		return placeholder;
	});

	return { contentHtml: protectedContent, embeds };
}

/**
 * プレースホルダーを `[埋め込み: タイトル](note-embed:タイトル)` 形式に戻す。
 * この形式は customMarked でリンクに変換され、後段の enhanceProseContent 内で
 * note-embed: リンクを fetch して本文に展開する。
 */
export function restoreNoteEmbeds(content: string, embeds: EmbedPlaceholder[]): string {
	let restored = content;
	for (const embed of embeds) {
		const linkText = `埋め込み: ${escapeMarkdownText(embed.title)}`;
		const encodedTitle = encodeURIComponent(embed.title);
		restored = restored.replace(embed.placeholder, `[${linkText}](note-embed:${encodedTitle})`);
	}
	return restored;
}
