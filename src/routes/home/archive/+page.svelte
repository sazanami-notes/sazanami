<script lang="ts">
	import type { PageData } from './$types';
	import TimelinePost from '$lib/components/TimelinePost.svelte';
	import type { Note } from '$lib/types';
	import EditNoteModal from '$lib/components/EditNoteModal.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let editingNote: Note | null = $state(null);
	let isSavingNote = $state(false);

	const notes = $derived(data.notes || []);

	function handleEdit(event: CustomEvent<Note>) {
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
	<div class="mx-auto max-w-2xl">
		<h1 class="mb-4 text-2xl font-bold">アーカイブ</h1>
		<div class="flex flex-col space-y-4">
			{#each notes as note (note.id)}
				<TimelinePost {note} mode="archive" on:edit={handleEdit} />
			{:else}
				<p class="text-center text-base-content text-opacity-60">
					アーカイブされたノートはありません。
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
