<script lang="ts">
	import TimelinePost from '$lib/components/TimelinePost.svelte';
	import type { Note } from '$lib/types';
	import NoteModal from '$lib/components/NoteModal.svelte';
	import SortSelector from '$lib/components/SortSelector.svelte';
	import EncounterCard from '$lib/components/EncounterCard.svelte';
	import QuickCapture from '$lib/components/QuickCapture.svelte';
	import { sortNotes, type SortKey } from '$lib/utils/note-utils';
	import type { EncounterNote } from '$lib/components/EncounterCard.svelte';

	type HomePageData = {
		notes: Note[];
		encounter: EncounterNote | null;
	};

	let { data }: { data: HomePageData } = $props();

	let editingNoteId: string | null = $state(null);
	let sortKey: SortKey = $state('updatedAt_desc');

	const rawNotes = $derived(data.notes || []);
	const notes = $derived(sortNotes(rawNotes, sortKey));
	const encounter = $derived(data.encounter);

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

		<!-- 出会い: FSRS式の再提示 -->
		<div class="mb-4">
			<EncounterCard initial={encounter} />
		</div>

		<div class="flex flex-col space-y-4">
			{#each notes as note (note.id)}
				<TimelinePost {note} on:edit={handleEdit} />
			{:else}
				<p class="text-base-content text-opacity-60 text-center">
					タイムラインにはまだ何もありません。
				</p>
			{/each}
		</div>
	</div>
</div>

<NoteModal noteId={editingNoteId} onclose={handleCloseEdit} />
