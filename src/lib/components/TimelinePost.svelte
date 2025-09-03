<script lang="ts">
	import type { Note } from '$lib/types';
	import { invalidateAll } from '$app/navigation';
	import { formatDistanceToNow } from 'date-fns';
	import { ja } from 'date-fns/locale';
	import { marked } from 'marked';
	import { createEventDispatcher } from 'svelte';

	export let note: Note & { tags: string[] };

	const dispatch = createEventDispatcher<{ edit: Note }>();

	function handleEditClick() {
		dispatch('edit', note);
	}

	let element: HTMLElement;
	let touchStartX = 0;
	let touchCurrentX = 0;
	let isSwiping = false;
	const swipeThreshold = 100; // Swipe distance in pixels to trigger action

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		isSwiping = true;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isSwiping) return;
		touchCurrentX = e.touches[0].clientX;
		const diff = touchCurrentX - touchStartX;
		element.style.transform = `translateX(${diff}px)`;
	}

	function handleTouchEnd() {
		if (!isSwiping) return;
		const diff = touchCurrentX - touchStartX;

		if (diff > swipeThreshold) {
			// Right swipe
			sendToBox();
		} else if (diff < -swipeThreshold) {
			// Left swipe
			sendToArchive();
		}

		// Reset style
		element.style.transform = 'translateX(0)';
		isSwiping = false;
		touchStartX = 0;
		touchCurrentX = 0;
	}

	async function updateNoteStatus(status: 'box' | 'archived') {
		try {
			const response = await fetch(`/api/notes/${note.id}/status`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status })
			});
			if (response.ok) {
				await invalidateAll();
			} else {
				console.error(`Failed to move note to ${status}`);
			}
		} catch (error) {
			console.error('Error updating note status:', error);
		}
	}

	async function togglePin() {
		try {
			const response = await fetch(`/api/notes/${note.id}/pin`, {
				method: 'POST'
			});
			if (response.ok) {
				await invalidateAll();
			} else {
				console.error('Failed to toggle pin');
			}
		} catch (error) {
			console.error('Error toggling pin:', error);
		}
	}

	const sendToBox = () => updateNoteStatus('box');
	const sendToArchive = () => updateNoteStatus('archived');

	const formattedDate = formatDistanceToNow(new Date(note.updatedAt), {
		addSuffix: true,
		locale: ja
	});
</script>

<div
	bind:this={element}
	class="card bg-base-100 shadow-md transition-transform duration-200 ease-in-out"
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
>
	<div
		class="card-body p-4"
		onclick={handleEditClick}
		onkeydown={(e) => e.key === 'Enter' && handleEditClick()}
		role="button"
		tabindex="0"
		aria-label="ノートを編集"
	>
		{#if note.isPinned}
			<div class="absolute top-2 right-2 text-primary">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						d="M16 12V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v8l-2 2v2h5.2v5l1.8 2 1.8-2v-5H18v-2l-2-2z"
					/>
				</svg>
			</div>
		{/if}

		<div class="prose max-w-none text-base-content">
			{@html marked(note.content || '')}
		</div>

		<div class="mt-4 flex items-center justify-between text-xs text-base-content/60">
			<span>{formattedDate}</span>
			<div class="card-actions">
				<button class="btn btn-ghost btn-xs" onclick|stopPropagation={togglePin}>
					{note.isPinned ? 'Unpin' : 'Pin'}
				</button>
				<button class="btn btn-ghost btn-xs" onclick|stopPropagation={sendToBox}>Box</button>
				<button class="btn btn-ghost btn-xs" onclick|stopPropagation={sendToArchive}
					>Archive</button
				>
			</div>
		</div>
	</div>
</div>
