<script lang="ts">
	import type { PageData } from './$types';
	import LinkExplorer from '$lib/components/LinkExplorer.svelte';
	import { page } from '$app/stores';
	import TiptapEditor from '$lib/components/TiptapEditor.svelte';
	import { format } from 'date-fns';
	import { ja } from 'date-fns/locale';

	export let data: PageData;

	let content = data.note.content;
	let title = data.note.title;
	let saveTimeout: ReturnType<typeof setTimeout>;
	let isSaving = false;
	let copySuccess = false;

	function copyAsMarkdown() {
		const markdownContent = `# ${title}\n\n---\n\n${content || ''}`;
		navigator.clipboard
			.writeText(markdownContent)
			.then(() => {
				copySuccess = true;
				setTimeout(() => {
					copySuccess = false;
				}, 2000);
			})
			.catch((err) => {
				console.error('Failed to copy text: ', err);
			});
	}

	function triggerAutoSave() {
		clearTimeout(saveTimeout);
		saveTimeout = setTimeout(async () => {
			isSaving = true;
			try {
				const response = await fetch(`/api/notes/${data.note.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title, content })
				});

				if (response.ok) {
					const updatedNote = await response.json();
					data.note.updatedAt = updatedNote.updatedAt;
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

	const handleContentChange = (event: { markdown: string }) => {
		content = event.markdown;
		triggerAutoSave();
	};

	const handleTitleInput = (event: Event) => {
		title = (event.target as HTMLInputElement).value;
		triggerAutoSave();
	};

	$: formattedUpdatedAt = data.note.updatedAt
		? format(new Date(data.note.updatedAt), 'yyyy年M月d日 HH:mm', { locale: ja })
		: '';
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
	<button
		class="btn btn-outline btn-sm {copySuccess ? 'btn-success' : ''}"
		onclick={copyAsMarkdown}
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
	</div>

	<hr class="border-base-300 my-4" />

	<div class="mb-4">
		<div class="min-h-[400px] w-full">
			{#key data.note.id}
				<TiptapEditor content={content ?? ''} onchange={handleContentChange} />
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
