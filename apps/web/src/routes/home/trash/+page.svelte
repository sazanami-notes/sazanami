<script lang="ts">
	import type { PageData } from './$types';
	import TimelinePost from '$lib/components/TimelinePost.svelte';
	import type { Note } from '$lib/types';
	import NoteModal from '$lib/components/NoteModal.svelte';
	import { invalidateAll } from '$app/navigation';
	import SortSelector from '$lib/components/SortSelector.svelte';
	import { sortNotes, type SortKey } from '$lib/utils/note-utils';

	let { data } = $props();

	let editingNoteId: string | null = $state(null);
	let sortKey: SortKey = $state('updatedAt_desc');

	const rawNotes = $derived(data.notes || []);
	const notes = $derived(sortNotes(rawNotes, sortKey));

	function handleEdit(event: CustomEvent<Note>) {
		editingNoteId = event.detail.id;
	}

	function handleCloseEdit() {
		editingNoteId = null;
	}

	function handleSort(event: CustomEvent<SortKey>) {
		sortKey = event.detail;
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mx-auto max-w-2xl">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-2xl font-bold">ゴミ箱</h1>
			<SortSelector bind:value={sortKey} on:sort={handleSort} />
		</div>
		<div class="flex flex-col space-y-4">
			{#each notes as note (note.id)}
				<TimelinePost {note} mode="trash" on:edit={handleEdit} on:delete={() => invalidateAll()} />
			{:else}
				<p class="text-center text-base-content text-opacity-60">ゴミ箱は空です。</p>
			{/each}
		</div>
	</div>
</div>

<NoteModal noteId={editingNoteId} onclose={handleCloseEdit} />
