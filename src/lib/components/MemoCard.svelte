<script lang="ts">
	import type { Note } from '$lib/types';
	import { goto } from '$app/navigation';
	import { formatDistanceToNow } from 'date-fns';
	import { ja } from 'date-fns/locale';

	export let note: Note;

	function truncateContent(content: string, maxLength: number = 150): string {
		if (!content) return '';
		return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
	}

	function formatDate(date: Date): string {
		return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ja });
	}
</script>

<div
	class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer border border-gray-200"
	on:click
	on:keydown={(e) => e.key === 'Enter' && goto(`/notes/${note.id}`)}
	role="button"
	tabindex="0"
>
	<div class="p-6">
		<!-- タイトル -->
		<h3 class="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
			{note.title || '無題のメモ'}
		</h3>

		<!-- コンテンツプレビュー -->
		<p class="text-gray-600 text-sm mb-4 line-clamp-3">
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

<style>
.line-clamp-2 {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.line-clamp-3 {
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
</style>