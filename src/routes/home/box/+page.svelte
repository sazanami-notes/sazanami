<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import type { BoxNote } from '$lib/types';
	import MemoCard from '$lib/components/MemoCard.svelte';
	import TagFilter from '$lib/components/TagFilter.svelte';
	import EditNoteModal from '$lib/components/EditNoteModal.svelte';

	let selectedTags: string[] = [];
	let allTags: string[] = get(page).data.allTags || [];
	let filteredNotes: BoxNote[] = [];

	let editingNote: BoxNote | null = null;
	let isSavingNote = false;

	$: {
		const notesStore = (get(page).data.notes || []) as BoxNote[];
		const filtered = notesStore.filter((note: BoxNote) => {
			const matchesTags =
				selectedTags.length === 0 || selectedTags.every((tag) => note.tags?.includes(tag));
			return matchesTags;
		});
		filteredNotes = filtered;
	}

	function createNewNote() {
		goto('/home/box/new');
	}

	function handleTagSelect(event: CustomEvent<string[]>) {
		selectedTags = event.detail;
	}

	function handleEdit(event: CustomEvent<BoxNote>) {
		editingNote = event.detail;
	}

	function handleCancelEdit() {
		editingNote = null;
	}

	async function handleSaveEdit(event: CustomEvent<{ title: string; content: string }>) {
		if (!editingNote) return;

		isSavingNote = true;
		try {
			const { title, content } = event.detail;
			const response = await fetch(`/api/notes/${editingNote.id}`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title, content })
				}
			);

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
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">ノート一覧</h1>
		<button onclick={createNewNote} class="btn btn-primary"> 新規ノート作成 </button>
	</div>

	<div class="mb-6">
		<TagFilter {allTags} on:tagSelect={handleTagSelect} />
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
		{#each filteredNotes as note (note.id)}
			<MemoCard {note} on:edit={handleEdit} />
		{/each}
	</div>

	{#if filteredNotes.length === 0}
		<div class="py-12 text-center">
			<p class="text-gray-500">メモが見つかりません</p>
		</div>
	{/if}
</div>

<EditNoteModal
	note={editingNote}
	on:save={handleSaveEdit}
	on:cancel={handleCancelEdit}
	saving={isSavingNote}
/>