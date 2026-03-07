<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import TimelinePost from '$lib/components/TimelinePost.svelte';
	import type { Note } from '$lib/types';
	import EditNoteModal from '$lib/components/EditNoteModal.svelte';
	import SortSelector from '$lib/components/SortSelector.svelte';
	import { sortNotes, type SortKey } from '$lib/utils/note-utils';

	let { data } = $props();

	let editingNote: Note | null = $state(null);
	let isSavingNote = $state(false);
	let sortKey: SortKey = $state('updatedAt_desc');

	const rawNotes = $derived(data.notes || []);
	const notes = $derived(sortNotes(rawNotes, sortKey));

	function handleEdit(event: CustomEvent<Note>) {
		console.log('Edit event received:', event.detail);
		editingNote = event.detail;
		console.log('editingNote set to:', editingNote);
	}

	function handleCancelEdit() {
		editingNote = null;
	}

	function handleSort(event: CustomEvent<SortKey>) {
		sortKey = event.detail;
	}

	async function handleSaveEdit(event: CustomEvent<{ title: string; content: string }>) {
		if (!editingNote) return;

		isSavingNote = true;
		try {
			const { title, content } = event.detail;
			const response = await fetch(`/api/notes/${editingNote.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, content })
			});

			if (response.ok) {
				editingNote = null;
				await invalidateAll();
			} else {
				alert('ノートの保存に失敗しました。');
				console.error('Failed to save note', await response.text());
			}
		} catch (error) {
			alert('エラーが発生しました。');
			console.error('Error saving note', error);
		} finally {
			isSavingNote = false;
		}
	}
</script>

<div class="container mx-auto px-4 py-8">
	<!-- Timeline Feed -->
	<div class="mx-auto max-w-2xl">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-2xl font-bold">タイムライン</h1>
			<SortSelector bind:value={sortKey} on:sort={handleSort} />
		</div>
		<div class="flex flex-col space-y-4">
			{#each notes as note (note.id)}
				<TimelinePost {note} on:edit={handleEdit} />
			{:else}
				<p class="text-center text-base-content text-opacity-60">
					タイムラインにはまだ何もありません。
				</p>
			{/each}
		</div>
	</div>
</div>

<EditNoteModal
	note={editingNote}
	on:save={handleSaveEdit}
	on:cancel={handleCancelEdit}
	saving={isSavingNote}
/>
