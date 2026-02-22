<script lang="ts">
	import type { Note } from '$lib/types';
	import { invalidateAll } from '$app/navigation';
	import { formatDistanceToNow } from 'date-fns';
	import { ja } from 'date-fns/locale';
	import { marked } from 'marked';
	import { createEventDispatcher } from 'svelte';

	export let note: Note & { tags: string[] };
	export let mode: 'timeline' | 'archive' | 'trash' = 'timeline';

	const dispatch = createEventDispatcher<{ edit: Note; delete: Note }>();

	let interactionDebounce = false;
	function handleInteraction() {
		if (interactionDebounce) return;
		interactionDebounce = true;

		console.log('Edit event dispatched for note:', note);
		dispatch('edit', note);

		setTimeout(() => {
			interactionDebounce = false;
		}, 300);
	}

	let element: HTMLElement;
	let deleteDialog: HTMLDialogElement;
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

		// Reset style
		element.style.transform = 'translateX(0)';
		isSwiping = false;

		if (Math.abs(diff) < 10) {
			// It's a tap, not a swipe.
			handleInteraction();
		} else if (mode === 'timeline') {
			if (diff > swipeThreshold) {
				// Right swipe
				sendToBox();
			} else if (diff < -swipeThreshold) {
				// Left swipe
				sendToArchive();
			}
		}

		touchStartX = 0;
		touchCurrentX = 0;
	}

	async function updateNoteStatus(status: 'inbox' | 'box' | 'archived' | 'trash') {
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

	function openDeleteModal() {
		if (deleteDialog) {
			deleteDialog.showModal();
		}
	}

	async function deletePermanently() {
		try {
			const response = await fetch(`/api/notes/${note.id}`, {
				method: 'DELETE'
			});
			if (response.ok) {
				if (deleteDialog) deleteDialog.close();
				dispatch('delete', note);
				await invalidateAll();
			} else {
				console.error('Failed to delete note permanently');
			}
		} catch (error) {
			console.error('Error deleting note permanently:', error);
		}
	}

	const sendToBox = () => updateNoteStatus('box');
	const sendToArchive = () => updateNoteStatus('archived');
	const sendToTrash = () => updateNoteStatus('trash');
	const restoreToInbox = () => updateNoteStatus('inbox');

	const formattedDate = formatDistanceToNow(new Date(note.updatedAt), {
		addSuffix: true,
		locale: ja
	});
</script>

<div
	bind:this={element}
	class="card bg-base-100 cursor-pointer shadow-md transition-transform duration-200 ease-in-out select-none"
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
	onclick={handleInteraction}
	onkeydown={(e) => e.key === 'Enter' && handleInteraction()}
	role="button"
	tabindex="0"
	aria-label="ノートを編集"
>
	<div class="card-body p-4">
		{#if note.isPinned}
			<div class="text-primary absolute top-2 right-2">
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

		<div class="prose text-base-content max-w-none">
			{@html marked.parse(note.content || '', { breaks: true })}
		</div>

		<div class="text-base-content/60 mt-4 flex items-center justify-between text-xs">
			<span>{formattedDate}</span>
			<div class="card-actions">
				{#if mode === 'timeline'}
					<button
						class="btn btn-ghost btn-xs"
						onclick={(e) => {
							e.stopPropagation();
							togglePin();
						}}
					>
						{note.isPinned ? 'Unpin' : 'Pin'}
					</button>
					<button
						class="btn btn-ghost btn-xs"
						onclick={(e) => {
							e.stopPropagation();
							sendToBox();
						}}
					>
						Box
					</button>
					<button
						class="btn btn-ghost btn-xs"
						onclick={(e) => {
							e.stopPropagation();
							sendToArchive();
						}}
					>
						Archive
					</button>
				{:else if mode === 'archive'}
					<button
						class="btn btn-ghost btn-xs"
						onclick={(e) => {
							e.stopPropagation();
							restoreToInbox();
						}}
					>
						Restore
					</button>
					<button
						class="btn btn-error btn-ghost btn-xs"
						onclick={(e) => {
							e.stopPropagation();
							sendToTrash();
						}}
					>
						Trash
					</button>
				{:else if mode === 'trash'}
					<button
						class="btn btn-ghost btn-xs"
						onclick={(e) => {
							e.stopPropagation();
							restoreToInbox();
						}}
					>
						Restore
					</button>
					<button
						class="btn btn-error btn-ghost btn-xs"
						onclick={(e) => {
							e.stopPropagation();
							openDeleteModal();
						}}
					>
						Delete
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- 削除確認モーダル -->
<dialog bind:this={deleteDialog} class="modal">
	<div class="modal-box text-left">
		<h3 class="text-error text-lg font-bold">削除の確認</h3>
		<p class="text-base-content py-4 whitespace-normal">
			このノートを完全に削除しますか？この操作は取り消せません。
		</p>
		<div class="modal-action">
			<form method="dialog">
				<button class="btn">キャンセル</button>
			</form>
			<button
				class="btn btn-error"
				onclick={(e) => {
					e.stopPropagation();
					deletePermanently();
				}}
			>
				削除する
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
