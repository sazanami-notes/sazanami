<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import type { Note } from '$lib/types';
	import MemoCard from '$lib/components/MemoCard.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import TagFilter from '$lib/components/TagFilter.svelte';

	let searchQuery = '';
	let selectedTags: string[] = [];
	let allTags: string[] = [];
	let filteredNotes: Note[] = [];

	$: {
		const notesStore = (get(page).data.notes || []) as Note[];
		const filtered = notesStore.filter((note: Note) => {
			const matchesTitle = note.title?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
			const matchesContent = note.content
				? note.content.toLowerCase().includes(searchQuery.toLowerCase())
				: false;
			const matchesSearch = matchesTitle || matchesContent;

			const matchesTags =
				selectedTags.length === 0 || selectedTags.every((tag) => note.tags?.includes(tag));
			return matchesSearch && matchesTags;
		});
		filteredNotes = filtered;
	}

	function createNewNote() {
		goto('/home/note/new');
	}

	function handleSearch(event: CustomEvent<string>) {
		searchQuery = event.detail;
	}

	function handleTagSelect(event: CustomEvent<string[]>) {
		selectedTags = event.detail;
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">ノート一覧</h1>
		<button on:click={createNewNote} class="btn btn-primary"> 新規ノート作成 </button>
	</div>

	<div class="mb-6">
		<SearchBar on:search={handleSearch} />
	</div>

	<div class="mb-6">
		<TagFilter {allTags} on:tagSelect={handleTagSelect} />
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
		{#each filteredNotes as note (note.id)}
			<MemoCard
				{note}
				on:click={() => {
					goto(`/home/note/${note.id}`);
				}}
			/>
		{/each}
	</div>

	{#if filteredNotes.length === 0}
		<div class="py-12 text-center">
			<p class="text-gray-500">メモが見つかりません</p>
		</div>
	{/if}
</div>
