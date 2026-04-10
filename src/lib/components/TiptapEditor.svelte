<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Placeholder from '@tiptap/extension-placeholder';
	import Link from '@tiptap/extension-link';
	import Image from '@tiptap/extension-image';
	import { Table } from '@tiptap/extension-table';
	import { TableRow } from '@tiptap/extension-table-row';
	import { TableCell } from '@tiptap/extension-table-cell';
	import { TableHeader } from '@tiptap/extension-table-header';
	import TaskItem from '@tiptap/extension-task-item';
	import TaskList from '@tiptap/extension-task-list';
	import { createLowlight, all } from 'lowlight';
	import { CodeBlockWithLanguage } from './extensions/CodeBlockWithLanguage';
	import { WikiLinkMark } from './extensions/WikiLinkMark';
	import { NoteEmbedNode } from './extensions/NoteEmbedNode';
	import { Markdown } from '@tiptap/markdown';
	import { goto } from '$app/navigation';

	const lowlight = createLowlight(all);

	type Props = {
		content?: string;
		editable?: boolean;
		placeholder?: string;
		onchange?: (event: { markdown: string }) => void;
	};

	let {
		content = $bindable(''),
		editable = true,
		placeholder = 'Write something...',
		onchange
	}: Props = $props();

	let element: HTMLElement;
	let editor: Editor | null = $state(null);
	let lastSyncedMarkdown = $state('');

	// 画像アップロード関連
	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let fileInputEl: HTMLInputElement;

	function normalizeMarkdown(markdown: string) {
		return markdown
			.replace(/\u00a0/g, ' ')
			.replace(/^[ \t]*&nbsp;[ \t]*$/gm, '')
			.replace(/&nbsp;/g, ' ');
	}

	// --- 画像アップロード処理 ---
	async function uploadImageFile(file: File): Promise<string | null> {
		if (!file.type.startsWith('image/')) return null;
		if (file.size > 10 * 1024 * 1024) {
			alert('画像ファイルのサイズは10MB以下にしてください。');
			return null;
		}

		isUploading = true;
		uploadProgress = 0;

		try {
			const formData = new FormData();
			formData.append('file', file);

			// XMLHttpRequest でプログレス表示
			const url = await new Promise<string>((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.open('POST', '/api/attachments');
				xhr.upload.onprogress = (e) => {
					if (e.lengthComputable) {
						uploadProgress = Math.round((e.loaded / e.total) * 100);
					}
				};
				xhr.onload = () => {
					if (xhr.status === 201) {
						const data = JSON.parse(xhr.responseText);
						resolve(data.url);
					} else {
						reject(new Error('Upload failed: ' + xhr.status));
					}
				};
				xhr.onerror = () => reject(new Error('Network error'));
				xhr.send(formData);
			});

			return url;
		} catch (err) {
			console.error('Image upload error:', err);
			alert('画像のアップロードに失敗しました。');
			return null;
		} finally {
			isUploading = false;
			uploadProgress = 0;
		}
	}

	async function insertImageFromFile(file: File) {
		const url = await uploadImageFile(file);
		if (url && editor) {
			editor.chain().focus().setImage({ src: url, alt: file.name }).run();
		}
	}

	function handleImageButtonClick() {
		fileInputEl?.click();
	}

	async function handleFileInputChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			await insertImageFromFile(file);
			input.value = ''; // リセット
		}
	}

	// --- WikiLink サジェスト ---
	type Suggestion = { id: string; title: string; slug: string };
	let suggestions: Suggestion[] = $state([]);
	let showSuggestions = $state(false);
	let suggestionQuery = $state('');
	let selectedIndex = $state(0);
	let suggestionPos = $state({ top: 0, left: 0 });
	let suggestContainer: HTMLElement = $state(null as unknown as HTMLElement);
	let debounceTimer: ReturnType<typeof setTimeout>;

	async function fetchSuggestions(q: string) {
		try {
			const res = await fetch(`/api/notes/suggestions?q=${encodeURIComponent(q)}`);
			if (res.ok) {
				suggestions = await res.json();
				selectedIndex = 0;
			}
		} catch {
			suggestions = [];
		}
	}

	function getWikiLinkQuery(): string | null {
		if (!editor) return null;
		const { state } = editor;
		const { from } = state.selection;
		// カーソル前のテキストを取得（最大50文字）
		const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, '\n');
		// ![[ または [[ で始まりまだ ]] で閉じていない部分を検索
		const match = textBefore.match(/(!?)\[\[([^\]\n]*)$/);
		return match ? match[2] : null;
	}

	function updateSuggestionPosition() {
		if (!editor) return;
		// カーソル位置のDOM座標を取得
		const { view } = editor;
		const { from } = view.state.selection;
		const coords = view.coordsAtPos(from);
		const editorRect = element.getBoundingClientRect();
		suggestionPos = {
			top: coords.bottom - editorRect.top + 4,
			left: coords.left - editorRect.left
		};
	}

	function onEditorUpdate() {
		if (!editable) return;
		const query = getWikiLinkQuery();
		if (query !== null) {
			suggestionQuery = query;
			updateSuggestionPosition();
			showSuggestions = true;
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => fetchSuggestions(query), 200);
		} else {
			showSuggestions = false;
			suggestions = [];
		}
	}

	function selectSuggestion(suggestion: Suggestion) {
		if (!editor) return;
		const { state, view } = editor;
		const { from } = state.selection;
		const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, '\n');
		const match = textBefore.match(/(!?)\[\[([^\]\n]*)$/);
		if (!match) return;

		const isEmbed = match[1] === '!';
		const deleteFrom = from - match[0].length;

		if (isEmbed) {
			// 埋め込みノードとして挿入する（Tiptapのコマンドでブロック分割を安全に行う）
			editor
				.chain()
				.focus()
				.deleteRange({ from: deleteFrom, to: from })
				.insertContent({
					type: 'noteEmbed',
					attrs: { title: suggestion.title }
				})
				// 次の段落を用意して入力を続けられるようにする
				.insertContent({ type: 'paragraph' })
				.run();
		} else {
			// 通常のWikiLinkとして挿入
			const text = suggestion.title;

			// 編集トランザクション: 文字列をマーク付きで挿入
			editor
				.chain()
				.focus()
				.deleteRange({ from: deleteFrom, to: from })
				.insertContent(
					`<a class="wiki-link font-medium text-primary hover:underline cursor-pointer transition-colors" data-wiki-link="true">${text}</a> `
				)
				.run();
		}

		showSuggestions = false;
		suggestions = [];
	}

	function handleKeyDown(e: KeyboardEvent): boolean {
		if (!showSuggestions || suggestions.length === 0) return false;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % suggestions.length;
			return true;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
			return true;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (suggestions[selectedIndex]) {
				selectSuggestion(suggestions[selectedIndex]);
			}
			return true;
		} else if (e.key === 'Escape') {
			showSuggestions = false;
			suggestions = [];
			return true;
		}
		return false;
	}

	onMount(() => {
		try {
			editor = new Editor({
				element: element,
				editable,
				extensions: [
					StarterKit.configure({
						codeBlock: false,
						// StarterKit includes Link internally - disable it to avoid duplicate extension warning
						link: false
					}),
					Placeholder.configure({
						placeholder: placeholder
					}),
					Link.configure({
						openOnClick: false,
						autolink: true
					}),
					Image,
					Table.configure({
						resizable: true
					}),
					TableRow,
					TableHeader,
					TableCell,
					TaskList,
					TaskItem.configure({
						nested: true
					}),
					CodeBlockWithLanguage.configure({
						lowlight
					}),
					WikiLinkMark,
					NoteEmbedNode,
					Markdown
				],
				content: normalizeMarkdown(content || ''),
				contentType: 'markdown',
				editorProps: {
					attributes: {
						class:
							'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[300px] p-4'
					},
					handleKeyDown(_, event) {
						// trueを返すとtiptapがイベントを消費（デフォルト動作を阻止）
						return handleKeyDown(event);
					},
					handleClick(view, pos, event) {
						if (event.ctrlKey || event.metaKey) {
							const target = event.target as HTMLElement;
							const link = target.closest('a[data-wiki-link="true"]');
							if (link) {
								event.preventDefault();
								const title = link.textContent;
								if (title) {
									fetch(`/api/notes/embed?title=${encodeURIComponent(title)}`)
										.then((res) => {
											if (res.ok) return res.json();
											throw new Error('Not found');
										})
										.then((data) => {
											if (data && data.id) {
												goto(`/home/note/${data.id}`);
											}
										})
										.catch((err) => console.error('Failed to open Note:', err));
								}
								return true;
							}
						}
						return false;
					},
					// 画像ペースト対応
					handlePaste(view, event) {
						if (!editable) return false;
						const items = event.clipboardData?.items;
						if (!items) return false;

						for (const item of Array.from(items)) {
							if (item.type.startsWith('image/')) {
								event.preventDefault();
								const file = item.getAsFile();
								if (file) {
									insertImageFromFile(file);
									return true;
								}
							}
						}
						return false;
					},
					// 画像ドロップ対応
					handleDrop(view, event) {
						if (!editable) return false;
						const files = event.dataTransfer?.files;
						if (!files || files.length === 0) return false;

						const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
						if (imageFiles.length === 0) return false;

						event.preventDefault();
						imageFiles.forEach((file) => insertImageFromFile(file));
						return true;
					}
				},
				onTransaction: ({ editor: e }) => {
					// トランザクションのたびにサジェスト状態を更新
					if (!editable) return;
					const { state } = e;
					const { from } = state.selection;
					const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, '\n');
					const match = textBefore.match(/(!?)\[\[([^\]\n]*)$/);
					if (match) {
						const query = match[2];
						updateSuggestionPosition();
						showSuggestions = true;
						if (query !== suggestionQuery) {
							suggestionQuery = query;
							clearTimeout(debounceTimer);
							debounceTimer = setTimeout(() => fetchSuggestions(query), 150);
						}
					} else {
						showSuggestions = false;
					}
				},
				onUpdate: ({ editor: e }) => {
					// Use Tiptap Markdown natively to export clean MD
					const md = normalizeMarkdown(e.getMarkdown());
					lastSyncedMarkdown = md;
					content = md; // コンポーネント外の `bind:content` に変更を通知する
					if (onchange) {
						onchange({ markdown: md });
					}
				}
			});

			lastSyncedMarkdown = normalizeMarkdown(editor.getMarkdown());
		} catch (error: any) {
			console.error('Editor init error:', error);
			alert('エディタの読み込みに失敗しました: ' + error.message);
		}
	});

	export function getMarkdownContent() {
		return editor ? editor.getMarkdown() : content;
	}

	onDestroy(() => {
		if (editor) {
			editor.destroy();
		}
		clearTimeout(debounceTimer);
	});

	$effect(() => {
		if (editor && editable !== editor.isEditable) {
			editor.setEditable(editable);
		}
	});

	let isUpdatingInternal = false;

	$effect(() => {
		if (editor && content !== undefined && !isUpdatingInternal) {
			const normalizedIncoming = normalizeMarkdown(content);
			const normalizedEditor = normalizeMarkdown(editor.getMarkdown());

			// Skip internal echo updates and only apply true external changes.
			if (normalizedIncoming !== normalizedEditor && normalizedIncoming !== lastSyncedMarkdown) {
				isUpdatingInternal = true;
				lastSyncedMarkdown = normalizedIncoming;
				editor.commands.setContent(normalizedIncoming, { contentType: 'markdown' });
				setTimeout(() => {
					isUpdatingInternal = false;
				}, 10);
			}
		}
	});
</script>

<div
	class="focus-within:border-primary focus-within:ring-primary bg-base-100 border-base-300 relative rounded-md border shadow-sm focus-within:ring-1"
>
	<!-- 画像アップロードボタン（編集モードのみ表示） -->
	{#if editable}
		<div class="border-base-300 flex items-center gap-1 border-b px-2 py-1">
			<button
				type="button"
				onclick={handleImageButtonClick}
				disabled={isUploading}
				class="btn btn-ghost btn-xs tooltip tooltip-bottom gap-1"
				data-tip="画像を挿入"
				title="画像をアップロード"
			>
				{#if isUploading}
					<span class="loading loading-spinner loading-xs"></span>
					<span class="text-xs">{uploadProgress}%</span>
				{:else}
					<!-- Image icon -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
					<span class="hidden text-xs sm:inline">画像</span>
				{/if}
			</button>

			<span class="text-base-content/40 text-xs">
				画像のペースト・ドロップも対応
			</span>
		</div>
		<!-- ファイル選択（非表示） -->
		<input
			bind:this={fileInputEl}
			type="file"
			accept="image/*"
			class="hidden"
			onchange={handleFileInputChange}
		/>
	{/if}

	<div bind:this={element} class="w-full"></div>

	{#if showSuggestions && suggestions.length > 0}
		<div
			bind:this={suggestContainer}
			class="wiki-suggest-dropdown border-base-300 bg-base-100 absolute z-50 max-h-48 w-64 overflow-y-auto rounded-lg border shadow-lg"
			style="top: {suggestionPos.top}px; left: {suggestionPos.left}px;"
		>
			{#each suggestions as suggestion, i (suggestion.id)}
				<button
					class="wiki-suggest-item flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors
						{i === selectedIndex ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}"
					onmousedown={(e) => {
						e.preventDefault(); // blur防止
						selectSuggestion(suggestion);
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-3.5 w-3.5 shrink-0 opacity-60"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<span class="truncate">{suggestion.title}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	:global(.tiptap p.is-editor-empty:first-child::before) {
		color: var(--color-base-content);
		opacity: 0.4;
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}

	/* Removed wiki-link-mark styling as we use tailwind classes now */

	/* Table styles */
	:global(.tiptap table) {
		border-collapse: collapse;
		table-layout: fixed;
		width: 100%;
		margin: 0;
		overflow: hidden;
	}
	:global(.tiptap td),
	:global(.tiptap th) {
		min-width: 1em;
		border: 2px solid var(--color-base-300);
		padding: 3px 5px;
		vertical-align: top;
		box-sizing: border-box;
		position: relative;
	}
	:global(.tiptap th) {
		font-weight: bold;
		text-align: left;
		background-color: var(--color-base-200);
	}
	:global(.tiptap .selectedCell:after) {
		z-index: 2;
		position: absolute;
		content: '';
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background: rgba(200, 200, 255, 0.4);
		pointer-events: none;
	}

	/* 挿入された画像のスタイル */
	:global(.tiptap img) {
		max-width: 100%;
		height: auto;
		border-radius: 0.375rem;
		cursor: pointer;
	}

	:global(.tiptap img.ProseMirror-selectednode) {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
</style>
