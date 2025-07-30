<script lang="ts">
	import type { Note } from '$lib/types';
	import { goto } from '$app/navigation';
	import { formatDistanceToNow } from 'date-fns';
	import { ja } from 'date-fns/locale';
	import { marked } from 'marked';
	import { generateSlug } from '$lib/utils/slug'; // generateSlugをインポート

	export let note: Note;

	// Note: MemoCardではMarkdownコンテンツのプレビューを表示するため、
	// wikiリンクの動的な解決は行わず、単にHTMLタグを除去してプレーンテキストとして扱います。
	function truncateContent(content: string, maxLength: number = 150): string {
		if (!content) return '';
		
		// MarkdownをHTMLに変換
		const htmlContent = marked.parse(content) as string;
		
		// HTMLタグを除去してプレーンテキストに変換
		const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
		const plainText = doc.body.textContent || '';
		
		// 指定された長さで切り捨て
		return plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText;
	}

	function formatDate(date: Date): string {
		return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ja });
	}

	// ノート詳細ページへのURLを生成するヘルパー関数
	function getNoteDetailUrl(note: Note): string {
		return `/notes/${note.id}/${generateSlug(note.title)}`;
	}
</script>

<div
	class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer border border-gray-200"
	on:click={() => goto(getNoteDetailUrl(note))}
	on:keydown={(e) => e.key === 'Enter' && goto(getNoteDetailUrl(note))}
	role="button"
	tabindex="0"
>
	<div class="p-8">
		<!-- タイトル -->
		<h3 class="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
			{note.title || '無題のメモ'}
		</h3>

		<!-- コンテンツプレビュー -->
		<p class="text-gray-600 text-sm mb-4 line-clamp-4">
			{truncateContent(note.content)}
		</p>

		<!-- タグ -->
		{#if note.tags && note.tags.length > 0}
			<div class="flex flex-wrap gap-1 mb-4">
				{#each note.tags.slice(0, 3) as tag}
					<span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
						{tag}
					</span>
				{/each}
				{#if note.tags.length > 3}
					<span class="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
						+{note.tags.length - 3}
					</span>
				{/if}
			</div>
		{/if}

		<!-- フッター -->
		<div class="flex justify-between items-center text-xs text-gray-500">
			<span>{formatDate(note.updatedAt)}</span>
			{#if note.isPublic}
				<span class="text-green-600">公開</span>
			{/if}
		</div>
	</div>
</div>