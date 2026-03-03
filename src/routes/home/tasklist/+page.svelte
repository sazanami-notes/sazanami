<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import TimelinePost from '$lib/components/TimelinePost.svelte';
	import type { Note } from '$lib/types';
	import EditNoteModal from '$lib/components/EditNoteModal.svelte';

	let { data } = $props();

	let editingNote: Note | null = $state(null);
	let isSavingNote = $state(false);

	const notes = $derived(data.notes || []);

	// Filter notes into those that have at least one uncompleted task, and those that only have completed tasks
	const incompleteNotes = $derived(
		notes.filter((note) => {
			const content = note.content || '';
			const totalTasks = (content.match(/data-type=["']taskItem["']/g) || []).length;
			const completedTasks = (content.match(/data-checked=["']true["']/g) || []).length;
			return totalTasks > completedTasks;
		})
	);

	const completedNotes = $derived(
		notes.filter((note) => {
			const content = note.content || '';
			const totalTasks = (content.match(/data-type=["']taskItem["']/g) || []).length;
			const completedTasks = (content.match(/data-checked=["']true["']/g) || []).length;
			return totalTasks > 0 && totalTasks === completedTasks;
		})
	);

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
	<!-- Timeline Feed (Filtered by tasks) -->
	<div class="mx-auto max-w-2xl">
		<h1 class="mb-4 text-2xl font-bold">タスクリスト</h1>

		<h2 class="mb-4 text-xl font-semibold opacity-80">未完了のタスク</h2>
		<div class="mb-8 flex flex-col space-y-4">
			{#each incompleteNotes as note (note.id)}
				<TimelinePost {note} on:edit={handleEdit} />
			{:else}
				<p class="text-center text-base-content text-opacity-60 py-4">
					未完了のタスクがあるノートはありません。
				</p>
			{/each}
		</div>

		{#if completedNotes.length > 0}
			<div class="collapse-arrow bg-base-200 border-base-300 collapse border">
				<input type="checkbox" />
				<div class="collapse-title text-xl font-medium opacity-80">
					完了済みのタスク ({completedNotes.length})
				</div>
				<div class="collapse-content">
					<div class="mt-2 flex flex-col space-y-4">
						{#each completedNotes as note (note.id)}
							<TimelinePost {note} on:edit={handleEdit} />
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<EditNoteModal
	note={editingNote}
	on:save={handleSaveEdit}
	on:cancel={handleCancelEdit}
	saving={isSavingNote}
/>
