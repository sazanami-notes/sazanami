<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import type { Note } from '$lib/types';
	import MemoCard from '$lib/components/MemoCard.svelte';
	import TagFilter from '$lib/components/TagFilter.svelte';
	import SortSelector from '$lib/components/SortSelector.svelte';
	import { sortNotes, type SortKey } from '$lib/utils/note-utils';
	import { ulid } from 'ulid';

	let selectedTags: string[] = [];
	let filteredNotes: Note[] = [];
	let sortKey: SortKey = 'updatedAt_desc';
	let isCreating = false;

	$: allTags = (get(page).data.allTags || []) as string[];

	$: {
		const notesStore = (get(page).data.notes || []) as Note[];
		const filtered = notesStore.filter((note: Note) => {
			const matchesTags =
				selectedTags.length === 0 || selectedTags.every((tag) => note.tags?.includes(tag));
			return matchesTags;
		});
		filteredNotes = sortNotes(filtered, sortKey);
	}

	async function createNewNote() {
		isCreating = true;
		try {
			const randomId = ulid().toLowerCase().substring(0, 8);
			const title = `無題のメモ - ${randomId}`;

			const response = await fetch('/api/notes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					title,
					content: '',
					status: 'box',
					skipTimeline: true
				})
			});

			if (!response.ok) {
				const error = await response.json();
				console.error('Failed to create note:', error);
				throw new Error(error.message || 'Failed to create note');
			}

			const newNote = await response.json();
			await goto(`/home/note/${newNote.id}`);
		} catch (error) {
			console.error('Error creating new note:', error);
			alert('メモの作成に失敗しました');
		} finally {
			isCreating = false;
		}
	}

	function handleTagSelect(event: CustomEvent<string[]>) {
		selectedTags = event.detail;
	}

	function handleSort(event: CustomEvent<SortKey>) {
		sortKey = event.detail;
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">ノート一覧</h1>
		<div class="flex gap-2">
			<a href="/home/box/archived" class="btn btn-ghost btn-sm">
				📁 アーカイブ
			</a>
			<a href="/home/box/deleted" class="btn btn-ghost btn-sm">
				🗑️ 削除済み
			</a>
			<button
				onclick={createNewNote}
				disabled={isCreating}
				class:loading={isCreating}
				class="btn btn-primary"
			>
				{#if isCreating}
					作成中...
				{:else}
					新規ノート作成
				{/if}
			</button>
		</div>
	</div>

	<div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex-1">
			<TagFilter {allTags} on:filter={handleTagSelect} />
		</div>
		<div class="shrink-0">
			<SortSelector bind:value={sortKey} on:sort={handleSort} />
		</div>
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
