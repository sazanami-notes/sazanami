<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { marked } from 'marked';
	import type { Note } from '$lib/types';

	let note: Note | null = null;
	let loading = true;
	let errorMessage = '';

	$: noteId = $page.params.id;

	onMount(async () => {
		try {
			const response = await fetch(`/api/notes/${noteId}`);
			if (response.ok) {
				note = await response.json();
			} else if (response.status === 404) {
				errorMessage = 'メモが見つかりません';
			} else {
				errorMessage = 'メモの取得に失敗しました';
			}
		} catch (error) {
			errorMessage = 'ネットワークエラーが発生しました';
		} finally {
			loading = false;
		}
	});

	async function handleDelete() {
		if (!confirm('このメモを削除してもよろしいですか？')) return;

		try {
			const response = await fetch(`/api/notes/${noteId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				goto('/notes');
			} else {
				errorMessage = 'メモの削除に失敗しました';
			}
		} catch (error) {
			errorMessage = 'ネットワークエラーが発生しました';
		}
	}

	function handleEdit() {
		goto(`/notes/${noteId}/edit`);
	}
	
	// MarkdownをHTMLに変換する関数
	async function convertMarkdownToHtml(markdown: string): Promise<string> {
		return marked.parse(markdown);
	}
</script>

<svelte:head>
	<title>{note?.title || 'メモ'} - Sazanami Notes</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
	{#if loading}
		<div class="flex justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if errorMessage}
		<div role="alert" class="alert alert-error">
			<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span>{errorMessage}</span>
		</div>
	{:else if note}
		<div class="bg-white shadow-lg rounded-lg p-6">
			<div class="flex justify-between items-start mb-4">
				<h1 class="text-3xl font-bold text-gray-900">{note.title}</h1>
				<div class="flex gap-2">
					<button class="btn btn-primary" on:click={handleEdit}>編集</button>
					<button class="btn btn-error" on:click={handleDelete}>削除</button>
				</div>
			</div>
			
			{#if note.tags && note.tags.length > 0}
				<div class="mb-4">
					<div class="flex flex-wrap gap-2">
						{#each note.tags as tag}
							<span class="badge badge-primary">{tag}</span>
						{/each}
					</div>
				</div>
			{/if}
			
			<div class="prose max-w-none">
				<!-- MarkdownをHTMLに変換して表示 -->
				{#await convertMarkdownToHtml(note.content)}
					<span class="loading loading-spinner loading-md"></span>
				{:then htmlContent}
					{@html htmlContent}
				{/await}
			</div>
			
			<div class="mt-6 text-sm text-gray-500">
				<p>作成日時: {new Date(note.createdAt).toLocaleString('ja-JP')}</p>
				{#if note.updatedAt !== note.createdAt}
					<p>更新日時: {new Date(note.updatedAt).toLocaleString('ja-JP')}</p>
				{/if}
			</div>
		</div>
	{/if}
</div>