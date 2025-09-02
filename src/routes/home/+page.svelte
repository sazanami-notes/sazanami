<script lang="ts">
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import MilkdownEditor from '$lib/components/MilkdownEditor.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let newPostContent = '';

	$: timelineEvents = data.timelineEvents || [];

	function formatTime(date: Date | string) {
		return new Date(date).toLocaleString();
	}

	function getEventMessage(event) {
		const noteLink = event.note && event.note.id ? `<a href="/home/note/${event.note.id}" class="link link-primary">${event.note.title || 'Untitled'}</a>` : `a note (ID: ${event.noteId})`;

		switch (event.type) {
			case 'note_created':
				return `You created ${noteLink}.`;
			case 'note_updated':
				if (event.metadata) {
					try {
						const changes = JSON.parse(event.metadata);
						let changeDesc = [];
						if (changes.title) changeDesc.push('title');
						if (changes.content_changed) changeDesc.push('content');
						if (changeDesc.length > 0) {
							return `You updated the ${changeDesc.join(' and ')} of ${noteLink}.`;
						}
					} catch (e) {
						// metadataがJSONでない場合
					}
				}
				return `You updated ${noteLink}.`;
			case 'note_deleted':
				let deletedMeta = {};
				try {
					if (event.metadata) deletedMeta = JSON.parse(event.metadata);
				} catch (e) {}
				return `You deleted a note (Title: ${deletedMeta.title || 'N/A'}).`;
			case 'note_status_changed':
				let statusMeta = {};
				try {
					if (event.metadata) statusMeta = JSON.parse(event.metadata);
				} catch (e) {}
				return `You moved ${noteLink} from <strong>${statusMeta.from}</strong> to <strong>${statusMeta.to}</strong>.`;
			case 'note_pinned':
				return `You pinned ${noteLink}.`;
			case 'note_unpinned':
				return `You unpinned ${noteLink}.`;
			default:
				return `An unknown event occurred on ${noteLink}.`;
		}
	}

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
	<div class="mb-8">
		<h1 class="mb-4 text-3xl font-bold">タイムライン</h1>
		<div class="card bg-base-200 p-4">
			<MilkdownEditor bind:content={newPostContent} editable={true} />
			<div class="card-actions mt-4 justify-end">
				<button on:click={handleSubmitPost} class="btn btn-primary">ポスト</button>
			</div>
		</div>
	</div>

	<!-- Timeline -->
	<div class="flow-root">
		<ul class="-mb-8">
			{#each timelineEvents as event, i (event.id)}
				<li>
					<div class="relative pb-8">
						{#if i !== timelineEvents.length - 1}
							<span class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-base-300" aria-hidden="true"></span>
						{/if}
						<div class="relative flex space-x-3">
							<div>
								<span class="h-8 w-8 rounded-full bg-base-300 flex items-center justify-center ring-8 ring-base-100">
									<!-- Icon can be dynamic based on event.type -->
									<svg class="h-5 w-5 text-base-content" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
									</svg>
								</span>
							</div>
							<div class="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
								<div>
									<p class="text-sm text-base-content">
										{@html getEventMessage(event)}
									</p>
								</div>
								<div class="text-right text-sm whitespace-nowrap text-base-content text-opacity-60">
									<time datetime={new Date(event.createdAt).toISOString()}>{formatTime(event.createdAt)}</time>
								</div>
							</div>
						</div>
					</div>
				</li>
			{:else}
				<p class="text-center text-base-content text-opacity-60">No timeline events yet.</p>
			{/each}
		</ul>
	</div>
</div>
