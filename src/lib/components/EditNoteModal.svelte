<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Note } from '$lib/types';
	import MilkdownEditor from './MilkdownEditor.svelte';

	let { note, saving = false }: { note: Note | null; saving?: boolean } = $props();

	const dispatch = createEventDispatcher<{ save: { title: string; content: string }; cancel: void }>();

	let dialog: HTMLDialogElement;
	let title = $state('');
	let content = $state('');

	$effect(() => {
		if (note) {
			title = note.title;
			content = note.content;
			if (!dialog.open) {
				dialog.showModal();
			}
		} else {
			if (dialog?.open) {
				dialog.close();
			}
		}
	});

	function handleSave() {
		dispatch('save', { title, content });
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
			<input
				type="text"
				bind:value={title}
				class="input input-bordered w-full mb-4 bg-base-200 text-lg font-bold"
				placeholder="タイトル"
			/>

			<div class="max-h-[60vh] overflow-y-auto">
				<MilkdownEditor bind:content={content} />
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
