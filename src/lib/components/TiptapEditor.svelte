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
	// @ts-expect-error: turndown types are sometimes structurally incompatible
	import TurndownService from 'turndown';
	import { marked } from 'marked';

	const lowlight = createLowlight(all);

	const turndownService = new TurndownService({
		headingStyle: 'atx',
		codeBlockStyle: 'fenced'
	});

	turndownService.addRule('listItemParagraph', {
		filter: 'p',
		replacement: function (content: string, node: any) {
			const isInsideList = node.parentNode && node.parentNode.nodeName === 'LI';
			if (isInsideList) {
				return content;
			}
			return '\n\n' + content + '\n\n';
		}
	});

	function convertHtmlToMarkdown(html: string) {
		let markdownBody = turndownService.turndown(html || '');
		const lines = markdownBody.split('\n');
		const cleanedLines = [];
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const isBlank = line.trim() === '';
			if (isBlank && i > 0 && i < lines.length - 1) {
				const prevLine = lines[i - 1];
				const nextLine = lines[i + 1];
				const prevIsListOrIndent =
					/^\s*(?:[-*+]|\d+\.)\s/.test(prevLine) || /^\s{2,}/.test(prevLine);
				const nextIsList = /^\s*(?:[-*+]|\d+\.)\s/.test(nextLine);
				if (prevIsListOrIndent && nextIsList) {
					continue;
				}
			}
			cleanedLines.push(line);
		}
		return cleanedLines.join('\n');
	}

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
					})
				],
				content: marked.parse(content || ''), // MarkdownからHTMLに変換して初期化
				editorProps: {
					attributes: {
						class:
							'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[300px] p-4'
					}
				},
				onUpdate: ({ editor: e }) => {
					const html = e.getHTML();
					// TurndownでMarkdownに変換し、不要な空行を除去して返す
					const md = convertHtmlToMarkdown(html);
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
		return editor ? convertHtmlToMarkdown(editor.getHTML()) : content;
	}

	onDestroy(() => {
		if (editor) {
			editor.destroy();
		}
	});

	$effect(() => {
		if (editor && editable !== editor.isEditable) {
			editor.setEditable(editable);
		}
	});

	let isUpdatingInternal = false;

	$effect(() => {
		if (editor && content !== undefined && !isUpdatingInternal) {
			const mdFromEditor = convertHtmlToMarkdown(editor.getHTML());
			if (content !== mdFromEditor) {
				isUpdatingInternal = true;
				// Promiseが返るmarked.parseを扱うため少し強引だが同期的に処理
				const htmlContent = marked.parse(content) as string;
				editor.commands.setContent(htmlContent);
				setTimeout(() => {
					isUpdatingInternal = false;
				}, 10);
			}
		}
	});
</script>

<div
	class="focus-within:border-primary focus-within:ring-primary bg-base-100 border-base-300 rounded-md border shadow-sm focus-within:ring-1"
>
	<div bind:this={element} class="w-full"></div>
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
