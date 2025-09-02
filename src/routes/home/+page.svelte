<script lang="ts">
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import MilkdownEditor from '$lib/components/MilkdownEditor.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let newPostContent = '';

	const timelineEvents = $derived(data.timelineEvents || []);

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
						const data = JSON.parse(event.metadata);
						const changes = data.changes || {};
						const changeDescs = [];

						if (changes.title && changes.title.before && changes.title.after) {
							changeDescs.push(
								`You updated the title of ${noteLink} from "<strong>${changes.title.before}</strong>" to "<strong>${changes.title.after}</strong>"`
							);
						} else if (changes.title) {
							changeDescs.push(`You updated the title of ${noteLink}`);
						}

						if (changes.content) {
							changeDescs.push(`You updated the content of ${noteLink}`);
						}

						if (changeDescs.length > 0) {
							return changeDescs.join('<br>');
						}
					} catch (e) {
						// metadataがJSONでないまたは予期しない構造の場合
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
			case 'note_tags_updated':
				if (event.metadata) {
					try {
						const tags = JSON.parse(event.metadata);
						const messages = [];
						if (tags.added && tags.added.length > 0) {
							messages.push(`You added tag(s): <strong>${tags.added.join(', ')}</strong> to ${noteLink}.`);
						}
						if (tags.removed && tags.removed.length > 0) {
							messages.push(`You removed tag(s): <strong>${tags.removed.join(', ')}</strong> from ${noteLink}.`);
						}
						if (messages.length > 0) {
							return messages.join('<br>');
						}
					} catch (e) {
						// metadataがJSONでないまたは予期しない構造の場合
					}
				}
				return `You updated tags on ${noteLink}.`;
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

	const icons = {
		note_created: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
		note_updated: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.696a8.25 8.25 0 00-11.667 0l-3.181 3.183',
		note_deleted: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
		note_status_changed: 'M12.75 15l3-3m0 0l-3-3m3 3h-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		note_pinned: 'M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6A2.25 2.25 0 016 3.75h1.5m9 0h-9',
		note_tags_updated: 'M5.25 2.25a2.25 2.25 0 012.25 2.25v13.5a2.25 2.25 0 01-4.5 0V4.5a2.25 2.25 0 012.25-2.25zM18.75 4.5a2.25 2.25 0 00-2.25 2.25v13.5a2.25 2.25 0 004.5 0V6.75a2.25 2.25 0 00-2.25-2.25zM11.25 2.25a2.25 2.25 0 012.25 2.25v15a2.25 2.25 0 01-4.5 0V4.5a2.25 2.25 0 012.25-2.25z',
		default: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z'
	};
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
									<svg class="h-5 w-5 text-base-content" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" d={icons[event.type] || icons['default']} />
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
