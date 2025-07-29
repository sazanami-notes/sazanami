<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';
	import { marked } from 'marked';
	import { defaultValueCtx, Editor, editorViewCtx, rootCtx, serializerCtx } from '@milkdown/core';
	import { commonmark } from '@milkdown/preset-commonmark';
	import { nord } from '@milkdown/theme-nord';
	import '@milkdown/theme-nord/style.css';
	import type { Note } from '$lib/types';

	let note: Note | null = null;
	let loading = true;
	let saving = false;
	let errorMessage = '';
	let milkdownEditor: Editor | undefined;

	let editorContainerElement: HTMLDivElement;

	let title = '';
	let content = '';
	let tagsInput = '';

	$: noteId = $page.params.id;
	$: tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

	onDestroy(() => {
		milkdownEditor?.destroy();
	});

	// メモの詳細を取得
	async function fetchNote() {
		try {
			const response = await fetch(`/api/notes/${noteId}`);
			if (response.ok) {
				note = await response.json();
				title = note.title;
				content = note.content;
				tagsInput = note.tags ? note.tags.join(', ') : '';
			} else if (response.status === 404) {
				errorMessage = 'メモが見つかりません';
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
				// 更新後に表示を更新
				note = updatedNote;
				title = updatedNote.title;
				content = updatedNote.content;
				tagsInput = updatedNote.tags ? updatedNote.tags.join(', ') : '';
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

	async function handleDelete() {
		if (!confirm('このメモを削除してもよろしいですか？')) return;

		try {
			const response = await fetch(`/api/notes/${noteId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				goto('/notes');
			} else {
				errorMessage = 'メモの削除に失敗しました';
			}
		} catch (error) {
			errorMessage = 'ネットワークエラーが発生しました';
		}
	}

	// MarkdownをHTMLに変換する関数
	async function convertMarkdownToHtml(markdown: string): Promise<string> {
		return marked.parse(markdown);
	}

	// コンポーネントがマウントされたらメモを取得
	onMount(() => {
		fetchNote();
	});
</script>

<svelte:head>
	<title>{note?.title || 'メモ'} - Sazanami Notes</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
	{#if loading}
		<div class="flex justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if errorMessage}
		<div role="alert" class="alert alert-error">
			<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span>{errorMessage}</span>
		</div>
	{:else if note}
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
			<div class="bg-white shadow-lg rounded-lg p-6 mb-6">
				<div class="flex justify-between items-start mb-4">
					<input
						type="text"
						id="title"
						bind:value={title}
						required
						class="text-3xl font-bold text-gray-900 w-full input input-ghost p-0 focus:outline-none focus:ring-0"
						placeholder="メモのタイトルを入力"
					/>
					<div class="flex gap-2 ml-4">
						<button class="btn btn-error" on:click={handleDelete} type="button">削除</button>
					</div>
				</div>
				
				{#if tags.length > 0 || tagsInput}
					<div class="mb-4">
						<div class="flex flex-wrap gap-2">
							{#each tags as tag}
								<span class="badge badge-primary">{tag}</span>
							{/each}
							<!-- タグ編集用の入力フィールド -->
							<input
								type="text"
								bind:value={tagsInput}
								class="input input-ghost input-xs p-0 focus:outline-none focus:ring-0"
								placeholder="タグを追加 (カンマ区切り)"
							/>
						</div>
					</div>
				{/if}
				
				<div class="prose max-w-none">
					<!-- Milkdownエディタのコンテナ -->
					<div bind:this={editorContainerElement} class="textarea textarea-ghost min-h-60 p-2 prose max-w-none focus:outline-none"></div>
				</div>
				
				<div class="mt-6 text-sm text-gray-500">
					<p>作成日時: {new Date(note.createdAt).toLocaleString('ja-JP')}</p>
					{#if note.updatedAt !== note.createdAt}
						<p>更新日時: {new Date(note.updatedAt).toLocaleString('ja-JP')}</p>
					{/if}
				</div>
			</div>

			<div class="flex items-center justify-end space-x-3">
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