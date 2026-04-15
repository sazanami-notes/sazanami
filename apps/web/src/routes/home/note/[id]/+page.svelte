<script lang="ts">
	import type { PageData } from './$types';
	import LinkExplorer from '$lib/components/LinkExplorer.svelte';
	import type { Note } from '$lib/types';
	import { onDestroy } from 'svelte';
	import TiptapEditor from '$lib/components/TiptapEditor.svelte';
	import { format } from 'date-fns';
	import { ja } from 'date-fns/locale';

	type NoteLinks = {
	oneHopLinks: Note[];
	backlinks: Note[];
	twoHopLinks: Note[];
	};

	type NotePageData = Omit<PageData, 'note' | 'links'> & {
		note: Omit<PageData['note'], 'contentBin'> & { contentBin: string };
		links: NoteLinks;
	};

	let { data }: { data: NotePageData } = $props();

	let content = $state('');
	let yjsUpdateBase64 = $state('');
	let currentHtml = $state('');
	let currentMd = $state('');
	let title = $state('');
	let saveTimeout: ReturnType<typeof setTimeout>;
	let isSaving = $state(false);
	let copySuccess = $state(false);
	let titleError = $state('');
	let lastSavedTitle = '';
	let lastSavedContent = '';
	let currentNoteId = $state('');
	let editorKey = $state(0);

	let isCopying = $state(false);

	$effect(() => {
		const nextNoteId = data.note.id;

		if (nextNoteId !== currentNoteId) {
			clearTimeout(saveTimeout);
			currentNoteId = nextNoteId;
			editorKey += 1;
		}

		content = data.note.content ?? '';
		yjsUpdateBase64 = data.note.contentBin ?? '';
		title = data.note.title ?? '';
		titleError = '';
		isMenuOpen = false;
		copySuccess = false;
		isSaving = false;
		isCopying = false;

		lastSavedTitle = title;
		lastSavedContent = content;
	});

	function normalizeMarkdownForClipboard(markdown: string) {
		return markdown
			// Convert non-breaking spaces to normal spaces first.
			.replace(/\u00a0/g, ' ')
			// Remove standalone "&nbsp;" lines often produced by pasted rich text.
			.replace(/^[ \t]*&nbsp;[ \t]*$/gm, '')
			// Replace remaining HTML entity spaces with regular spaces.
			.replace(/&nbsp;/g, ' ');
	}

	async function expandEmbedsInMarkdown(markdown: string) {
		const regex = /!\[\[(.*?)\]\]/g;
		const matches = [...markdown.matchAll(regex)];
		let expandedMarkdown = markdown;

		for (const match of matches) {
			const embedTitle = match[1];
			try {
				const res = await fetch(`/api/notes/embed?title=${encodeURIComponent(embedTitle)}`);
				if (res.ok) {
					const data = (await res.json()) as { content?: string };
					const text = (data.content || '').trim();
					expandedMarkdown = expandedMarkdown.replace(match[0], text);
				}
			} catch (err) {
				console.error(`Failed to fetch embed: ${embedTitle}`, err);
			}
		}

		return expandedMarkdown;
	}

	async function copyAsMarkdown(options?: { expandEmbeds?: boolean }) {
		isCopying = true;
		try {
			let markdownContent = `# ${title}\n\n---\n\n${currentMd || content || ''}`;

			if (options?.expandEmbeds) {
				markdownContent = await expandEmbedsInMarkdown(markdownContent);
			}

			markdownContent = normalizeMarkdownForClipboard(markdownContent);

			await navigator.clipboard.writeText(markdownContent);

			copySuccess = true;
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy text: ', err);
		} finally {
			isCopying = false;
		}
	}

	function triggerAutoSave() {
		clearTimeout(saveTimeout);
		const targetNoteId = data.note.id;
		saveTimeout = setTimeout(async () => {
			if (targetNoteId !== data.note.id) {
				return;
			}

			if (title === lastSavedTitle && content === lastSavedContent) {
				return;
			}

			isSaving = true;
			try {
				const response = await fetch(`/api/notes/${data.note.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title, content })
				});

				if (response.status === 409) {
					const err = (await response.json()) as { message?: string };
					titleError = err.message || '同じタイトルのノートが既に存在します';
				} else if (response.ok) {
					titleError = '';
					const updatedNote = (await response.json()) as { title?: string; content?: string };
					lastSavedTitle = updatedNote.title ?? title;
					lastSavedContent = updatedNote.content ?? content;
					// タイトル、更新日時だけでなく、resolvedLinksなども含めて更新する
					Object.assign(data.note, updatedNote);
					// 下のLinkExplorerなどを最新にするためにデータを再取得
					const { invalidateAll } = await import('$app/navigation');
					await invalidateAll();
				} else {
					console.error('Failed to auto-save note', await response.text());
				}
			} catch (error) {
				console.error('Error auto-saving note:', error);
			} finally {
				isSaving = false;
			}
		}, 1000);
	}

	onDestroy(() => {
		clearTimeout(saveTimeout);
	});

	const handleContentChange = (event: { markdown: string }) => {
		content = event.markdown;
		triggerAutoSave();
	};

	const handleTitleInput = (event: Event) => {
		title = (event.target as HTMLInputElement).value;
		triggerAutoSave();
	};

	const formattedUpdatedAt = $derived(
		data.note.updatedAt
			? format(new Date(data.note.updatedAt), 'yyyy年M月d日 HH:mm', { locale: ja })
			: ''
	);

	let isMenuOpen: boolean = $state(false);
	let isUpdatingStatus: boolean = $state(false);

	async function updateNoteStatus(newStatus: string) {
		isUpdatingStatus = true;
		try {
			const response = await fetch(`/api/notes/${data.note.id}/status`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ status: newStatus })
			});

			if (!response.ok) {
				const error = (await response.json()) as { message?: string };
				console.error('Failed to update note status:', error);
				throw new Error(error.message || 'Failed to update note status');
			}

			isMenuOpen = false;
			const { goto } = await import('$app/navigation');
			await goto('/home/box');
		} catch (error) {
			console.error('Error updating note status:', error);
			alert('ステータスの更新に失敗しました');
		} finally {
			isUpdatingStatus = false;
		}
	}
</script>

<div class="mb-6 flex items-center justify-between">
	<a href="/home/box" class="btn btn-ghost btn-sm">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="mr-1 h-4 w-4"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
			/>
		</svg>
		一覧に戻る
	</a>
	<div class="flex gap-2">
		<button
			class="btn btn-outline btn-sm {copySuccess ? 'btn-success' : ''}"
			onclick={() => copyAsMarkdown()}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="mr-1 h-4 w-4"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
				/>
			</svg>
			{copySuccess ? 'コピーしました！' : 'Markdownコピー'}
		</button>
		
		<!-- 三点リーダーメニュー -->
		<div class="dropdown dropdown-end">
			<button
				class="btn btn-ghost btn-sm"
				onclick={() => (isMenuOpen = !isMenuOpen)}
				type="button"
			>
				⋮
			</button>
			{#if isMenuOpen}
				<ul class="dropdown-content z-1 menu p-2 shadow bg-base-100 rounded-box w-52">
					<li>
						<button
							onclick={async () => {
								await copyAsMarkdown({ expandEmbeds: true });
								isMenuOpen = false;
							}}
							disabled={isCopying}
							type="button"
						>
							{isCopying ? 'コピー中...' : '引用を展開してコピー'}
						</button>
					</li>
					{#if data.note.status === 'box'}
						<li>
							<button
								onclick={() => updateNoteStatus('box-archived')}
								disabled={isUpdatingStatus}
								type="button"
							>
								📁 アーカイブ
							</button>
						</li>
						<li>
							<button
								onclick={() => updateNoteStatus('box-deleted')}
								disabled={isUpdatingStatus}
								type="button"
							>
								🗑️ 削除
							</button>
						</li>
					{:else if data.note.status === 'box-archived'}
						<li>
							<button
								onclick={() => updateNoteStatus('box')}
								disabled={isUpdatingStatus}
								type="button"
							>
								↩️ Box に戻す
							</button>
						</li>
						<li>
							<button
								onclick={() => updateNoteStatus('box-deleted')}
								disabled={isUpdatingStatus}
								type="button"
							>
								🗑️ 削除
							</button>
						</li>
					{:else if data.note.status === 'box-deleted'}
						<li>
							<button
								onclick={() => updateNoteStatus('box')}
								disabled={isUpdatingStatus}
								type="button"
							>
								↩️ Box に戻す
							</button>
						</li>
					{/if}
				</ul>
			{/if}
		</div>
	</div>
</div>

<div class="prose max-w-none">
	<div class="mb-4">
		<input
			type="text"
			id="title"
			name="title"
			bind:value={title}
			oninput={handleTitleInput}
			class="w-full bg-transparent px-3 py-2 text-3xl font-bold focus:outline-none"
			placeholder="タイトルを入力..."
		/>
		{#if titleError}
			<p class="text-error px-3 text-sm">{titleError}</p>
		{/if}
	</div>

	<hr class="border-base-300 my-4" />

	<div class="mb-4">
		<div class="min-h-100 w-full">
			{#key editorKey}
				<TiptapEditor content={content ?? ''} noteId={data.note.id} onchange={handleContentChange} />
			{/key}
		</div>
	</div>

	<hr class="border-base-300 my-4 border-t-2 border-dashed" />

	<div class="flex items-center justify-end space-x-4">
		{#if isSaving}
			<span class="text-base-content/60 text-sm">保存中...</span>
		{:else}
			<span class="text-base-content/60 pr-2 text-sm">最終更新: {formattedUpdatedAt}</span>
		{/if}
	</div>
</div>

{#if data.links}
	<div class="mt-8">
		<LinkExplorer
			oneHopLinks={data.links.oneHopLinks}
			backlinks={data.links.backlinks}
			twoHopLinks={data.links.twoHopLinks}
		/>
	</div>
{/if}
