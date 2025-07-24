<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import MemoCard from '$lib/components/MemoCard.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import TagFilter from '$lib/components/TagFilter.svelte';
	import type { Note } from '$lib/types';

	let notes: Note[] = [];
	let filteredNotes: Note[] = [];
	let loading = true;
	let searchQuery = '';
	let selectedTags: string[] = [];
	let allTags: string[] = [];
	let currentPage = 1;
	let totalPages = 1;
	let limit = 20;

	// URLパラメータから初期値を取得
	$: {
		const url = new URL($page.url);
		searchQuery = url.searchParams.get('search') || '';
		currentPage = parseInt(url.searchParams.get('page') || '1');
	}

	function updateURL() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
		if (currentPage > 1) params.set('page', currentPage.toString());
		
		goto(`/notes?${params}`, { replaceState: true });
	}

	async function loadNotes() {
		loading = true;
		try {
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: limit.toString()
			});

			if (searchQuery) params.set('search', searchQuery);
			if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));

			const response = await fetch(`/api/notes?${params}`);
			if (response.ok) {
				const data = await response.json() as { notes: Note[]; pagination: { totalPages: number } };
				notes = data.notes;
				filteredNotes = notes;
				totalPages = data.pagination.totalPages;
				// 全タグを収集
				allTags = [...new Set(notes.flatMap(note => note.tags || []))];
			}
		} catch (error) {
			console.error('Error loading notes:', error);
		} finally {
			loading = false;
		}
	}

	function handleSearch(e: CustomEvent<string>) {
		const query = e.detail;
		searchQuery = query;
		currentPage = 1;
		updateURL();
		loadNotes();
	}

	function handleTagFilter(e: CustomEvent<string[]>) {
		const tags = e.detail;
		selectedTags = tags;
		currentPage = 1;
		updateURL();
		loadNotes();
	}

	function handlePageChange(page: number) {
		currentPage = page;
		updateURL();
		loadNotes();
	}

	function createNewNote() {
		goto('/notes/new');
	}

	onMount(() => {
		loadNotes();
	});
</script>

<svelte:head>
	<title>メモ一覧 - Sazanami Notes</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-7xl">
	<!-- ヘッダー -->
	<div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
		<div>
			<h1 class="text-3xl font-bold text-neutral-content mb-2">メモ一覧</h1>
			<p class="text-base-content">あなたのメモを管理しましょう</p>
		</div>
		<button
			on:click={createNewNote}
			class="btn btn-primary mt-4 md:mt-0"
		>
			新規メモ作成
		</button>
	</div>

	<!-- 検索とフィルター -->
	<div class="mb-6 space-y-4">
		<SearchBar {searchQuery} on:search={handleSearch} />
		<TagFilter {allTags} {selectedTags} on:filter={handleTagFilter} />
	</div>

	<!-- ローディング -->
	{#if loading}
		<div class="flex justify-center items-center py-12">
			<span class="loading loading-spinner text-primary loading-lg"></span>
		</div>
	{:else if filteredNotes.length === 0}
		<!-- 空の状態 -->
		<div class="text-center py-12">
			<svg class="mx-auto h-12 w-12 text-base-content mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			<h3 class="text-lg font-medium text-neutral-content mb-2">メモがありません</h3>
			<p class="text-base-content mb-4">新しいメモを作成して始めましょう</p>
			<button
				on:click={createNewNote}
				class="btn btn-primary"
			>
				最初のメモを作成
			</button>
		</div>
	{:else}
		<!-- メモ一覧 -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
			{#each filteredNotes as note}
				<MemoCard {note} on:click={() => goto(`/notes/${note.id}`)} />
			{/each}
		</div>

		<!-- ページネーション -->
		{#if totalPages > 1}
			<div class="join">
				{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
					<button
						class="join-item btn btn-sm {page === currentPage ? 'btn-active' : ''}"
						on:click={() => handlePageChange(page)}
					>
						{page}
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</div>