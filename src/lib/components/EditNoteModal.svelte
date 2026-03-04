<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Note } from '$lib/types';
	import TiptapEditor from './TiptapEditor.svelte';

	let { note, saving = false }: { note: Note | null; saving?: boolean } = $props();

	const dispatch = createEventDispatcher<{
		save: { title: string; content: string };
		cancel: void;
	}>();

	let dialog: HTMLDialogElement;
	let title = $state('');
	let content = $state('');
	let lastNoteId = $state<string | null>(null);

	$effect.pre(() => {
		if (note && note.id !== lastNoteId) {
			title = note.title;
			content = note.content;
			lastNoteId = note.id;
		} else if (!note) {
			lastNoteId = null;
		}
	});

	$effect(() => {
		if (note) {
			if (dialog && !dialog.open) {
				dialog.showModal();
			}
		} else {
			if (dialog?.open) {
				dialog.close();
			}
		}
	});

	function handleContentChange(event: CustomEvent<{ markdown: string }>) {
		content = event.detail.markdown;
	}

	function handleSave() {
		dispatch('save', { title, content });
	}

	function handleClose() {
		// This event is fired by the dialog on ESC or when a form with method="dialog" is submitted
		// We dispatch 'cancel' to let the parent know it should set its note state to null.
		dispatch('cancel');
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
			e.preventDefault();
			if (!saving) {
				handleSave();
			}
		}
	}
</script>

<dialog bind:this={dialog} class="modal" onclose={handleClose} onkeydown={handleKeydown}>
	<div class="modal-box w-11/12 max-w-4xl">
		{#if note}
			<input
				type="text"
				bind:value={title}
				class="input input-bordered bg-base-200 mb-4 w-full text-lg font-bold"
				placeholder="タイトル"
			/>

			<div class="max-h-[60vh] min-h-[300px] overflow-y-auto">
				<TiptapEditor bind:content />
			</div>

			<div class="modal-action mt-6">
				<form method="dialog">
					<button class="btn" disabled={saving}>Cancel</button>
				</form>
				<button class="btn btn-primary" onclick={handleSave} disabled={saving}>
					{#if saving}
						<span class="loading loading-spinner"></span>
						Saving...
					{:else}
						Save
					{/if}
				</button>
			</div>
		{:else}
			<!-- Note is null, showing placeholder -->
			<p>Dialog is ready but no note is selected.</p>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
