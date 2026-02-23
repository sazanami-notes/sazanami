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
	let showTitleInput = $state(false);

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
				showTitleInput = false;
			}
		}
	});

	function handleSave() {
		dispatch('save', { title, content });
	}

	function handleClose() {
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
		{#if showTitleInput || title}
			<input
				type="text"
				bind:value={title}
				class="input input-bordered bg-base-200 mb-4 w-full text-lg font-bold"
				placeholder="タイトル"
			/>
		{:else}
			<button
				class="btn btn-ghost btn-sm mb-4 text-xs font-normal opacity-60 hover:opacity-100"
				onclick={() => {
					showTitleInput = true;
				}}
			>
				Add title
			</button>
		{/if}

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
