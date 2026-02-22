<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import TiptapEditor from './TiptapEditor.svelte';

	let { open, saving = false }: { open: boolean; saving?: boolean } = $props();

	const dispatch = createEventDispatcher<{
		save: { title: string; content: string };
		cancel: void;
	}>();

	let dialog: HTMLDialogElement;
	let title = $state('');
	let content = $state('');

	$effect(() => {
		if (open) {
			if (!dialog?.open) {
				dialog.showModal();
			}
		} else {
			if (dialog?.open) {
				dialog.close();
				title = '';
				content = '';
			}
		}
	});

	function handleSave() {
		dispatch('save', { title, content });
	}

	function handleClose() {
		dispatch('cancel');
	}
</script>

<dialog bind:this={dialog} class="modal" onclose={handleClose}>
	<div class="modal-box w-11/12 max-w-4xl">
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
					ポスト
				{/if}
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
