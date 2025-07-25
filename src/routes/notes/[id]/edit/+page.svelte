<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { defaultValueCtx, Editor, editorViewCtx, rootCtx, serializerCtx } from '@milkdown/core';
	import { commonmark } from '@milkdown/preset-commonmark';
	import { nord } from '@milkdown/theme-nord';
	import '@milkdown/theme-nord/style.css';
	import type { Note } from '$lib/types';

	let title = '';
	let content = '';
	let tagsInput = '';
	let loading = true;
	let saving = false;
	let errorMessage = '';
	let milkdownEditor: Editor | undefined;

	let editorContainerElement: HTMLDivElement;

	const noteId = $page.params.id;

	$: tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

	onDestroy(() => {
		milkdownEditor?.destroy();
	});

	// メモの詳細を取得
	async function fetchNote() {
		try {
			const response = await fetch(`/api/notes/${noteId}`);
			if (response.ok) {
				const note: Note = await response.json();
				title = note.title;
				content = note.content;
				tagsInput = note.tags ? note.tags.join(', ') : '';
			} else {
				errorMessage = 'メモの取得に失敗しました';
			}
		} catch (error) {
			errorMessage = 'ネットワークエラーが発生しました';
		} finally {
			loading = false;
		}
	}

	// Svelteのライフサイクルでエディタを初期化
	$: if (editorContainerElement && !milkdownEditor && !loading) {
		Editor.make()
			.config(nord)
			.config((ctx) => {
				ctx.set(rootCtx, editorContainerElement);
				ctx.set(defaultValueCtx, content);
			})
			.use(commonmark)
			.create()
			.then((editor) => {
				milkdownEditor = editor;
			})
			.catch(e => {
				console.error('Failed to create Milkdown editor:', e);
				errorMessage = 'エディタの初期化に失敗しました。';
			});
	}

	async function handleSubmit() {
		saving = true;
		errorMessage = '';
		// 保存直前にMilkdownエディタの最新内容をMarkdown形式でcontent変数に取得
		content = milkdownEditor?.action((ctx) => {
			const editorView = ctx.get(editorViewCtx);
			const serializer = ctx.get(serializerCtx);
			return serializer(editorView.state.doc);
		}) || '';

		try {
			const response = await fetch(`/api/notes/${noteId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ title, content, tags })
			});

			if (response.ok) {
				const updatedNote: Note = await response.json();
				goto(`/notes/${updatedNote.id}`);
			} else {
				const errorData: { message?: string } = await response.json();
				errorMessage = errorData.message || 'メモの更新に失敗しました。';
			}
		} catch (error) {
			console.error('Error updating note:', error);
			errorMessage = 'ネットワークエラーが発生しました。';
		} finally {
			saving = false;
		}
	}

	// コンポーネントがマウントされたらメモを取得
	fetchNote();
</script>

<svelte:head>
	<title>メモ編集 - Sazanami Notes</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
	<h1 class="text-3xl font-bold text-gray-900 mb-6">メモ編集</h1>

	{#if loading}
		<div class="flex justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else}
		<!-- エラーメッセージ -->
		{#if errorMessage}
			<div role="alert" class="alert alert-error mb-4">
				<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span>エラー! {errorMessage}</span>
			</div>
		{/if}

		<form on:submit|preventDefault={handleSubmit} class="space-y-6">
			<div>
				<label for="title" class="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
				<input
					type="text"
					id="title"
					bind:value={title}
					required
					class="input input-bordered w-full"
					placeholder="メモのタイトルを入力"
				/>
			</div>

			<div>
				<label for="content" class="block text-sm font-medium text-gray-700 mb-1">内容</label>
				<!-- Milkdownエディタのコンテナ -->
				<div bind:this={editorContainerElement} class="textarea textarea-bordered min-h-60 p-2 prose max-w-none"></div>
			</div>

			<div>
				<label for="tags" class="block text-sm font-medium mb-1">タグ (カンマ区切り)</label>
				<input
					type="text"
					id="tags"
					bind:value={tagsInput}
					class="input input-bordered w-full"
					placeholder="例: Svelte, JavaScript, プログラミング"
				/>
				{#if tags.length > 0}
					<div class="mt-2 flex flex-wrap gap-2">
						{#each tags as tag}
							<span class="badge badge-primary">
								{tag}
							</span>
						{/each}
					</div>
				{/if}
			</div>

			<div class="flex items-center justify-end space-x-3">
				<button
					type="button"
					on:click={() => goto(`/notes/${noteId}`)}
					class="btn btn-outline"
				>
					キャンセル
				</button>
				<button
					type="submit"
					class="btn btn-primary"
					disabled={saving}
				>
					{#if saving}
						保存中...
					{:else}
						メモを更新
					{/if}
				</button>
			</div>
		</form>
	{/if}
</div>