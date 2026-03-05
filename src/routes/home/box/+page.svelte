<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import type { Note } from '$lib/types';
	import MemoCard from '$lib/components/MemoCard.svelte';
	import TagFilter from '$lib/components/TagFilter.svelte';

	let selectedTags: string[] = [];
	let allTags: string[] = [];
	let filteredNotes: Note[] = [];

	$: {
		const notesStore = (get(page).data.notes || []) as Note[];
		const filtered = notesStore.filter((note: Note) => {
			const matchesTags =
				selectedTags.length === 0 || selectedTags.every((tag) => note.tags?.includes(tag));
			return matchesTags;
		});
		filteredNotes = filtered;
	}

	function createNewNote() {
		goto('/home/note/new?status=box');
	}

	function handleTagSelect(event: CustomEvent<string[]>) {
		selectedTags = event.detail;
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">ノート一覧</h1>
		<button onclick={createNewNote} class="btn btn-primary"> 新規ノート作成 </button>
	</div>

	<div class="mb-6">
		<TagFilter {allTags} on:tagSelect={handleTagSelect} />
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		{#each filteredNotes as note (note.id)}
			<MemoCard {note} linkToDetail={true} />
		{/each}
	</div>

	{#if filteredNotes.length === 0}
		<div class="py-12 text-center">
			<p class="opacity-50">メモが見つかりません</p>
		</div>
	{/if}
</div>
