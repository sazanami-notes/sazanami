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

	let {
		content = $bindable(''),
		editable = true,
		placeholder = 'Write something...',
		onchange
	} = $props<{
		content?: string;
		editable?: boolean;
		placeholder?: string;
		onchange?: (event: { markdown: string }) => void;
	}>();

	let element: HTMLElement;
	let editor: Editor | null = $state(null);

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
						codeBlock: false
					}),
					Placeholder.configure({
						placeholder: placeholder
					}),
					Link.configure({
						openOnClick: false
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
				content: content || '',
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
					const md = e.getMarkdown();
					content = md; // コンポーネント外の `bind:content` に変更を通知する
					if (onchange) {
						onchange({ markdown: md });
					}
				}
			});
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
			const mdFromEditor = editor.getMarkdown();
			if (content !== mdFromEditor) {
				isUpdatingInternal = true;
				editor.commands.setContent(content, { contentType: 'markdown' });
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
</style>
