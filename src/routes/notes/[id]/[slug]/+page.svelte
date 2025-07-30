<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { afterUpdate } from 'svelte';
	import { marked } from 'marked';
	import { defaultValueCtx, Editor, editorViewCtx, rootCtx, serializerCtx } from '@milkdown/core';
	import { commonmark } from '@milkdown/preset-commonmark';
	import { nord } from '@milkdown/theme-nord';
	import '@milkdown/theme-nord/style.css';
	import type { Note, ResolvedLink } from '$lib/types'; // ResolvedLink をインポート
	import { ulid } from 'ulid';
	import { generateSlug } from '$lib/utils/slug';

	// +page.server.tsから渡されるデータを受け取る
	export let data;

	let note: Note | null = data.note;
	let loading = false; // データはload関数で既に取得されているためfalse
	let saving = false;
	let errorMessage = '';
	let milkdownEditor: Editor | undefined;

	let editorContainerElement: HTMLDivElement;

	let title = note?.title || '';
	let content = note?.content || '';
	let tagsInput = note?.tags ? note.tags.join(', ') : '';
	let noteId: string | null = note?.id || null;
	let isNewNote = !note; // noteオブジェクトが存在しない場合は新規作成

	$: tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

	onDestroy(() => {
		milkdownEditor?.destroy();
	});

	// Svelteのライフサイクルでエディタを初期化
	// noteがnull（新規作成）でない場合、または新規作成モードで初期値がない場合にエディタを初期化
	$: if (editorContainerElement && !milkdownEditor && !loading) {
		Editor.make()
			.config(nord)
			.config((ctx) => {
				ctx.set(rootCtx, editorContainerElement);
				ctx.set(defaultValueCtx, content); // data.noteから取得したcontentを初期値に設定
			})
			.use(commonmark)
			.create()
			.then((editor) => {
				milkdownEditor = editor;
				// エディタ初期化後、初回レンダリング時にリンク解決を試みる
				// DOMが完全に構築されるまで少し待つ必要があるかもしれない
				setTimeout(resolveWikiLinks, 0); // DOM更新サイクルを待つ
			})
			.catch(e => {
				console.error('Failed to create Milkdown editor:', e);
				errorMessage = 'エディタの初期化に失敗しました。';
			});
	}

	// Markdownコンテンツがレンダリングされた後に、wikiリンクを解決する関数
	async function resolveWikiLinks() {
		if (!editorContainerElement) return;

		// Milkdownエディタが生成したDOM要素の中から、data-wiki-link属性を持つspan要素をすべて取得
		const wikiLinkSpans = editorContainerElement.querySelectorAll('span[data-wiki-link]');

		for (const span of Array.from(wikiLinkSpans)) {
			// spanをHTMLElementにキャスト
			const htmlSpan = span as HTMLElement;
			const linkText = htmlSpan.dataset.wikiLink;
			if (!linkText) continue;

			// 既に処理済みのリンク（aタグに変換済み、またはエラー表示済み）はスキップ
			if (htmlSpan.closest('a') || htmlSpan.classList.contains('link-unresolved')) {
				continue;
			}

			try {
				// バックエンドAPIを呼び出し、リンクテキストからノートのIDとスラッグを解決
				const response = await fetch(`/api/notes/resolve-link?title=${encodeURIComponent(linkText)}`);
				if (response.ok) {
					const { id, slug }: ResolvedLink = await response.json(); // ResolvedLink 型を指定
					const url = `/notes/${id}/${slug}`;

					// span要素をaタグに変換（またはラップ）
					const a = document.createElement('a');
					a.href = url;
					a.textContent = linkText;
					a.className = 'link link-hover text-primary'; // DaisyUIのリンクスタイルを適用
					a.onclick = (e) => {
						e.preventDefault();
						goto(url); // SvelteKitのgoto関数でクライアントサイドルーティング
					};
					htmlSpan.replaceWith(a); // spanをaタグで置き換え
				} else {
					// ノートが見つからない場合、リンク切れを示すスタイルを適用
					htmlSpan.classList.add('link-unresolved', 'text-error'); // 赤色のテキストにするなど
					htmlSpan.title = `ノート「${linkText}」は見つかりませんでした。`; // ツールチップを追加
				}
			} catch (error) {
				console.error(`Failed to resolve wiki link for "${linkText}":`, error);
				htmlSpan.classList.add('link-unresolved', 'text-error');
				htmlSpan.title = `リンク解決中にエラーが発生しました: ${linkText}`;
			}
		}
	}

	afterUpdate(() => {
		// Milkdownエディタが初期化されており、かつDOMが更新された後にリンク解決を試みる
		if (milkdownEditor) {
			resolveWikiLinks();
		}
	});

	async function handleSubmit() {
		saving = true;
		errorMessage = '';
		// 保存直前にMilkdownエディタの最新内容をMarkdown形式でcontent変数に取得
		content = milkdownEditor?.action((ctx) => {
			const editorView = ctx.get(editorViewCtx);
			const serializer = ctx.get(serializerCtx);
			return serializer(editorView.state.doc);
		}) || '';

		const payload = {
			title,
			content,
			tags
		};

		let response: Response;
		try {
			if (isNewNote) {
				// 新規作成の場合
				const newId = ulid();
				response = await fetch('/api/notes', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ id: newId, ...payload })
				});

				if (response.ok) {
					const createdNote: Note = await response.json();
					// 新規作成後、スラッグを含んだURLにリダイレクト
					goto(`/notes/${createdNote.id}/${generateSlug(createdNote.title)}`);
				} else {
					const errorData: { message?: string } = await response.json();
					errorMessage = errorData.message || 'ノートの作成に失敗しました。';
				}
			} else {
				// 既存ノートの更新の場合
				response = await fetch(`/api/notes/${noteId}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(payload)
				});

				if (response.ok) {
					const updatedNote: Note = await response.json();
					note = updatedNote;
					title = updatedNote.title;
					content = updatedNote.content;
					tagsInput = updatedNote.tags ? updatedNote.tags.join(', ') : '';
					// 更新後、スラッグが変更された場合はリダイレクト
					const currentSlug = $page.params.slug;
					const newSlug = generateSlug(updatedNote.title);
					if (currentSlug !== newSlug) {
						goto(`/notes/${updatedNote.id}/${newSlug}`, { replaceState: true });
					}
				} else {
					const errorData: { message?: string } = await response.json();
					errorMessage = errorData.message || 'メモの更新に失敗しました。';
				}
			}
		} catch (error) {
			console.error('Error saving note:', error);
			errorMessage = 'ネットワークエラーが発生しました。';
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!noteId) return; // noteIdがnullの場合は削除処理を行わない
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

	// MarkdownをHTMLに変換する関数 (現在未使用だが残しておく)
	async function convertMarkdownToHtml(markdown: string): Promise<string> {
		return marked.parse(markdown);
	}
</script>

<svelte:head>
	<title>{isNewNote ? '新規メモ作成' : note?.title || 'メモ'} - Sazanami Notes</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
	<h1 class="text-3xl font-bold text-gray-900 mb-6">{isNewNote ? '新規メモ作成' : 'メモを編集'}</h1>

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
						{#if !isNewNote}
						<button class="btn btn-error" on:click={handleDelete} type="button">削除</button>
						{/if}
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
				
				{#if !isNewNote && note}
				<div class="mt-6 text-sm text-gray-500">
					<p>作成日時: {new Date(note.createdAt).toLocaleString('ja-JP')}</p>
					{#if note.updatedAt !== note.createdAt}
						<p>更新日時: {new Date(note.updatedAt).toLocaleString('ja-JP')}</p>
					{/if}
				</div>
				{/if}
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
						{isNewNote ? 'メモを作成' : 'メモを更新'}
					{/if}
				</button>
			</div>
		</form>
	{/if}
</div>