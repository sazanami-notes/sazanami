<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Note } from '$lib/types';
	import MilkdownEditor from './MilkdownEditor.svelte';

	export let note: Note;
	export let saving = false;

	const dispatch = createEventDispatcher<{ save: string; cancel: void }>();

	let content = note.content;

	function handleSave() {
		dispatch('save', content);
	}

	function handleCancel() {
		dispatch('cancel');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleCancel();
		}
	}

	onMount(() => {
		// This is just a placeholder for potential future logic
		return () => {
			// Cleanup logic if needed
		};
	});
</script>

<svelte:window on:keydown={handleKeydown} />

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
	on:click|self={handleCancel}
>
	<div class="card bg-base-100 w-11/12 max-w-4xl shadow-xl">
		<div class="card-body p-4 sm:p-6">
			<h2 class="card-title mb-4">{note.title}</h2>

			<div class="max-h-[60vh] overflow-y-auto">
				<MilkdownEditor bind:value={content} />
			</div>

			<div class="card-actions mt-6 justify-end">
				<button class="btn" on:click={handleCancel} disabled={saving}>Cancel</button>
				<button class="btn btn-primary" on:click={handleSave} disabled={saving}>
					{#if saving}
						<span class="loading loading-spinner"></span>
						Saving...
					{:else}
						Save
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>
