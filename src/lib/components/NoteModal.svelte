<script lang="ts">
	import TiptapEditor from './TiptapEditor.svelte';
	import { invalidateAll } from '$app/navigation';

	let {
		noteId = null,
		open = false,
		onclose
	}: {
		noteId?: string | null;
		open?: boolean;
		onclose?: () => void;
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let title = $state('');
	let content = $state('');
	let showTitleInput = $state(false);
	let autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error' = $state('idle');
	let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
	let lastNoteId: string | null = $state(null);
	let initialized = $state(false);

	// noteIdが変更されたら既存ノートの内容を読み込む
	$effect(() => {
		if (noteId && noteId !== lastNoteId) {
			lastNoteId = noteId;
			initialized = false;
			autoSaveStatus = 'idle';
			loadNote(noteId);
		} else if (!noteId) {
			lastNoteId = null;
			initialized = false;
		}
	});

	// ダイアログの開閉制御
	$effect(() => {
		const isOpen = open || !!noteId;
		if (isOpen) {
			if (dialog && !dialog.open) {
				dialog.showModal();
			}
		} else {
			if (dialog && dialog.open) {
				dialog.close();
				resetState();
			}
		}
	});

	// contentまたはtitleが変更されたら自動保存をトリガー
	$effect(() => {
		// titleとcontentの変更を検知するためにアクセスする
		const _t = title;
		const _c = content;

		if (!noteId || !initialized) return;

		triggerAutoSave();
	});

	async function loadNote(id: string) {
		try {
			const res = await fetch(`/api/notes/${id}`);
			if (res.ok) {
				const note = await res.json();
				title = note.title || '';
				content = note.content || '';
				showTitleInput = !!note.title;
				// 読み込み完了後にinitializedをセット（読み込み自体の変更で保存が走らないように）
				setTimeout(() => {
					initialized = true;
				}, 100);
			}
		} catch (e) {
			console.error('Failed to load note:', e);
		}
	}

	function triggerAutoSave() {
		if (!noteId) return;

		if (autoSaveTimer) {
			clearTimeout(autoSaveTimer);
		}

		autoSaveStatus = 'saving';
		const currentNoteId = noteId;
		const currentTitle = title;
		const currentContent = content;

		autoSaveTimer = setTimeout(async () => {
			if (!currentNoteId) return;
			try {
				const response = await fetch(`/api/notes/${currentNoteId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title: currentTitle, content: currentContent })
				});

				if (response.ok) {
					autoSaveStatus = 'saved';
					setTimeout(() => {
						if (autoSaveStatus === 'saved') {
							autoSaveStatus = 'idle';
						}
					}, 3000);
				} else {
					autoSaveStatus = 'error';
					console.error('Auto-save failed', await response.text());
				}
			} catch (error) {
				autoSaveStatus = 'error';
				console.error('Auto-save error', error);
			}
		}, 800);
	}

	function resetState() {
		title = '';
		content = '';
		showTitleInput = false;
		autoSaveStatus = 'idle';
		initialized = false;
		if (autoSaveTimer) {
			clearTimeout(autoSaveTimer);
			autoSaveTimer = null;
		}
	}

	async function handleClose() {
		// タイマーが残っていたらクリア
		if (autoSaveTimer) {
			clearTimeout(autoSaveTimer);
			autoSaveTimer = null;
		}

		// 新規作成モードで内容が空の場合はノートを削除
		if (noteId && !content?.trim() && !title?.trim()) {
			try {
				await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
			} catch (e) {
				console.error('Error cleaning up empty note:', e);
			}
		}

		resetState();
		await invalidateAll();
		onclose?.();
	}
</script>

<dialog bind:this={dialog} class="modal" onclose={handleClose}>
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

		<div class="modal-action mt-6 flex items-center justify-between">
			<div class="text-sm">
				{#if autoSaveStatus === 'saving'}
					<span class="text-base-content/60 flex items-center gap-1">
						<span class="loading loading-spinner loading-xs"></span>
						保存中...
					</span>
				{:else if autoSaveStatus === 'saved'}
					<span class="text-success flex items-center gap-1">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
								clip-rule="evenodd"
							/>
						</svg>
						保存しました
					</span>
				{:else if autoSaveStatus === 'error'}
					<span class="text-error flex items-center gap-1">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
								clip-rule="evenodd"
							/>
						</svg>
						保存に失敗しました
					</span>
				{/if}
			</div>
			<form method="dialog">
				<button class="btn" onclick={handleClose}>閉じる</button>
			</form>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
