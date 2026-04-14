<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import TimelinePost from '$lib/components/TimelinePost.svelte';
	import type { Note } from '$lib/types';
	import NoteModal from '$lib/components/NoteModal.svelte';

	let { data } = $props();

	let editingNoteId: string | null = $state(null);

	const notes = $derived(data.notes || []);

	function countTasks(contentHtml: string) {
		const htmlTaskItems = (content.match(/data-type=["']taskItem["']/g) || []).length;
		const htmlCompleted = (content.match(/data-checked=["']true["']/g) || []).length;

		const markdownTaskItems = (content.match(/^\s*[-*+]\s+\[(?: |x|X)\]\s+/gm) || []).length;
		const markdownCompleted = (content.match(/^\s*[-*+]\s+\[(?:x|X)\]\s+/gm) || []).length;

		return {
			total: htmlTaskItems + markdownTaskItems,
			completed: htmlCompleted + markdownCompleted
		};
	}

	// Filter notes into those that have at least one uncompleted task, and those that only have completed tasks
	const incompleteNotes = $derived(
		notes.filter((note) => {
			const content = note.contentHtml || '';
			const { total: totalTasks, completed: completedTasks } = countTasks(content);
			return totalTasks > completedTasks;
		})
	);

	const completedNotes = $derived(
		notes.filter((note) => {
			const content = note.contentHtml || '';
			const { total: totalTasks, completed: completedTasks } = countTasks(content);
			return totalTasks > 0 && totalTasks === completedTasks;
		})
	);

	function handleEdit(event: CustomEvent<Note>) {
		editingNoteId = event.detail.id;
	}

	function handleCloseEdit() {
		editingNoteId = null;
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

<NoteModal noteId={editingNoteId} onclose={handleCloseEdit} />
