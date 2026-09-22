<script lang="ts">
	import TimelinePost from '$lib/components/TimelinePost.svelte';
	import type { Note } from '$lib/types';
	import NoteModal from '$lib/components/NoteModal.svelte';
	import SortSelector from '$lib/components/SortSelector.svelte';
	import QuickCapture from '$lib/components/QuickCapture.svelte';
	import { sortNotes, type SortKey } from '$lib/utils/note-utils';

	type HomePageData = {
		notes: Note[];
		repliesByParent?: Record<string, (Note & { tags: string[] })[]>;
	};

	let { data }: { data: HomePageData } = $props();

	let editingNoteId: string | null = $state(null);
	let sortKey: SortKey = $state('updatedAt_desc');

	const rawNotes = $derived(data.notes || []);
	const notes = $derived(sortNotes(rawNotes, sortKey));
	const repliesByParent = $derived(data.repliesByParent || {});

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

{#snippet replyTree(parentId: string)}
	{#if repliesByParent[parentId]?.length}
		<div class="border-base-300 mt-1 ml-4 space-y-2 border-l-2 pl-3">
			{#each repliesByParent[parentId] as reply (reply.id)}
				<TimelinePost note={reply} on:edit={handleEdit} compact />
				{@render replyTree(reply.id)}
			{/each}
		</div>
	{/if}
{/snippet}

<div class="container mx-auto px-4 py-8">
	<!-- Timeline Feed -->
	<div class="mx-auto max-w-2xl">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-2xl font-bold">タイムライン</h1>
			<SortSelector bind:value={sortKey} on:sort={handleSort} />
		</div>

		<!-- 取るUI: クイックキャプチャ -->
		<div class="mb-4">
			<QuickCapture />
		</div>

		<div class="flex flex-col space-y-4">
			{#each notes as note (note.id)}
				<div>
					<TimelinePost {note} on:edit={handleEdit} />
					{@render replyTree(note.id)}
				</div>
			{:else}
				<p class="text-base-content text-opacity-60 text-center">
					タイムラインにはまだ何もありません。
				</p>
			{/each}
		</div>
	</div>
</div>

<NoteModal noteId={editingNoteId} onclose={handleCloseEdit} />
