<script lang="ts">
	import type { PageData } from './$types';
	import MilkdownEditor from '$lib/components/MilkdownEditor.svelte';
	import { invalidateAll } from '$app/navigation';
	import MemoCard from '$lib/components/MemoCard.svelte';

	let { data } = $props();

	let newPostContent = '';

	const notes = $derived(data.notes || []);

	async function handleSubmitPost() {
		if (!newPostContent.trim()) {
			return;
		}

		try {
			const response = await fetch('/api/notes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					content: newPostContent
				})
			});

			if (response.ok) {
				newPostContent = '';
				await invalidateAll(); // データ再読み込み
			} else {
				console.error('Failed to submit post:', await response.text());
			}
		} catch (error) {
			console.error('Error submitting post:', error);
		}
	}
</script>

<div class="container mx-auto px-4 py-8">
	<!-- Post Input Area -->
	<div class="mx-auto mb-8 max-w-2xl">
		<h1 class="mb-4 text-3xl font-bold">タイムライン</h1>
		<div class="card bg-base-200 p-4">
			<div class="max-h-48 overflow-y-auto">
				<MilkdownEditor bind:content={newPostContent} editable={true} />
			</div>
			<div class="card-actions mt-4 justify-end">
				<button on:click={handleSubmitPost} class="btn btn-primary">ポスト</button>
			</div>
		</div>
	</div>

	<!-- Notes Grid -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
		{#each notes as note (note.id)}
			<MemoCard {note} />
		{:else}
			<p class="text-center text-base-content text-opacity-60">ノートがまだありません。</p>
		{/each}
	</div>
</div>
