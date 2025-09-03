<script lang="ts">
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import type { Note } from '$lib/types';
	import MilkdownEditor from './MilkdownEditor.svelte';

	let { note, saving = false }: { note: Note | null; saving?: boolean } = $props();

	const dispatch = createEventDispatcher<{ save: string; cancel: void }>();

	let dialog: HTMLDialogElement;
	let content = '';

	$effect(() => {
		if (note) {
			content = note.content;
			dialog?.showModal();
		} else {
			// When the note is set to null (e.g., by parent), close the dialog
			dialog?.close();
		}
	});

	function handleSave() {
		dispatch('save', content);
	}

	function handleClose() {
		// This event is fired by the dialog on ESC or when a form with method="dialog" is submitted
		// We dispatch 'cancel' to let the parent know it should set its note state to null.
		dispatch('cancel');
	}
</script>

<dialog bind:this={dialog} class="modal" onclose={handleClose}>
	<div class="modal-box w-11/12 max-w-4xl">
		{#if note}
			<h2 class="card-title mb-4">{note.title}</h2>

			<div class="max-h-[60vh] overflow-y-auto">
				<MilkdownEditor bind:value={content} />
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
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
