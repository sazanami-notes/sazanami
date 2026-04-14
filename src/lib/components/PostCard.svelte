<script lang="ts">
	import type { Note } from '$lib/types';
	import { createEventDispatcher } from 'svelte';

	export let note: Note;

	const dispatch = createEventDispatcher<{
		delete: string;
		archive: string;
		box: string;
		pin: string;
	}>();

	let touchStartX = 0;
	let touchCurrentX = 0;
	let cardElement: HTMLDivElement;
	let isSwiping = false;
	const swipeThreshold = 100; // Swipe distance in pixels to trigger action

	function onTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		isSwiping = true;
	}

	function onTouchMove(e: TouchEvent) {
		if (!isSwiping) return;
		touchCurrentX = e.touches[0].clientX;
		const deltaX = touchCurrentX - touchStartX;
		cardElement.style.transform = `translateX(${deltaX}px)`;
	}

	function onTouchEnd() {
		if (!isSwiping) return;
		const deltaX = touchCurrentX - touchStartX;

		if (deltaX > swipeThreshold) {
			// Right swipe -> Box
			dispatch('box', note.id);
			// The parent component will handle the removal of the card
		} else if (deltaX < -swipeThreshold) {
			// Left swipe -> Archive
			dispatch('archive', note.id);
		} else {
			// Snap back
			cardElement.style.transform = 'translateX(0)';
		}
		isSwiping = false;
		touchStartX = 0;
		touchCurrentX = 0;
	}

	function handlePinClick() {
		dispatch('pin', note.id);
	}
</script>

<div
	bind:this={cardElement}
	class="card bg-base-100 rounded-box overflow-hidden shadow-md transition-transform duration-200 ease-out"
	class:border-primary={note.isPinned}
	class:border-2={note.isPinned}
	ontouchstart={onTouchStart}
	ontouchmove={onTouchMove}
	ontouchend={onTouchEnd}
	role="article"
	aria-label="Post card for {note.title}"
>
	<div class="p-4">
		<div class="flex items-start justify-between">
			<a href="/home/note/{note.id}" class="flex-grow">
				<h2 class="card-title mb-2 line-clamp-1 text-lg font-bold">{note.title}</h2>
				<div class="text-base-content/70 mb-3 line-clamp-3 text-sm">
					{@html note.content
						? note.content.substring(0, 200) + (note.content.length > 200 ? '...' : '')
						: ''}
				</div>
			</a>
			<button
				class="btn btn-ghost btn-sm btn-square"
				onclick={(e) => {
					e.stopPropagation();
					handlePinClick();
				}}
				aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
			>
				{#if note.isPinned}
					<!-- Heroicon: pin (solid) -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="h-6 w-6"
					>
						<path
							fill-rule="evenodd"
							d="M16.5 3.75a.75.75 0 0 1 .75.75v13.19l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0l-3.75-3.75a.75.75 0 1 1 1.06-1.06l2.47 2.47V4.5a.75.75 0 0 1 .75-.75Zm-10.5 0a.75.75 0 0 1 .75.75v13.19l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0L2.22 16.53a.75.75 0 1 1 1.06-1.06l2.47 2.47V4.5a.75.75 0 0 1 .75-.75Z"
							clip-rule="evenodd"
						/>
					</svg>
				{:else}
					<!-- Heroicon: pin (outline) -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="h-6 w-6"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M16.5 3.75a.75.75 0 0 1 .75.75v13.19l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0l-3.75-3.75a.75.75 0 1 1 1.06-1.06l2.47 2.47V4.5a.75.75 0 0 1 .75-.75Zm-10.5 0a.75.75 0 0 1 .75.75v13.19l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0L2.22 16.53a.75.75 0 1 1 1.06-1.06l2.47 2.47V4.5a.75.75 0 0 1 .75-.75Z"
						/>
					</svg>
				{/if}
			</button>
		</div>
		<div class="mt-2 flex flex-wrap gap-1">
			{#each note.tags as tag (tag)}
				<span class="badge badge-sm badge-ghost">{tag}</span>
			{/each}
		</div>
	</div>
</div>
