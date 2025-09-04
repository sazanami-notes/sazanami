<script lang="ts">
	import type { PageData } from './$types';
	import MilkdownEditor from '$lib/components/MilkdownEditor.svelte';
	import { invalidateAll } from '$app/navigation';
	import TimelinePost from '$lib/components/TimelinePost.svelte';

	let { data } = $props();

	let newPostContent = $state('');

	const posts = $derived(data.posts || []);

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
		<div class="card bg-base-200 p-4">
			<div class="max-h-48 overflow-y-auto">
				<MilkdownEditor bind:content={newPostContent} editable={true} placeholder="いまどうしてる？" />
			</div>
			<div class="card-actions mt-4 justify-end">
				<button onclick={handleSubmitPost} class="btn btn-primary">ポスト</button>
			</div>
		</div>
	</div>

	<!-- Timeline Feed -->
	<div class="mx-auto max-w-2xl">
		<div class="flex flex-col space-y-4">
			{#each posts as post (post.id)}
				<TimelinePost note={post} />
			{:else}
				<p class="text-center text-base-content text-opacity-60">タイムラインにはまだ何もありません。</p>
			{/each}
		</div>
	</div>
</div>