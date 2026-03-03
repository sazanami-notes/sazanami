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
	import 'highlight.js/styles/github-dark.css';

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
		onchange?: (event: CustomEvent<{ markdown: string }>) => void;
	}>();

	let element: HTMLElement;
	let editor: Editor | null = $state(null);

	onMount(() => {
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
			content: content,
			editorProps: {
				attributes: {
					class:
						'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[300px] p-4'
				}
			},
			onUpdate: ({ editor: e }) => {
				const html = e.getHTML();
				content = html;
				if (onchange) {
					onchange(new CustomEvent('change', { detail: { markdown: html } }));
				}
			}
		});
	});

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
		if (editor && content !== undefined) {
			const currentContent = editor.getHTML();
			if (content !== currentContent && !isUpdatingInternal) {
				isUpdatingInternal = true;
				editor.commands.setContent(content);
				setTimeout(() => {
					isUpdatingInternal = false;
				}, 0);
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

	/* Task list styles */
	:global(.tiptap ul[data-type='taskList']) {
		list-style: none;
		padding: 0;
	}
	:global(.tiptap ul[data-type='taskList'] li) {
		display: flex;
		align-items: flex-start;
	}
	:global(.tiptap ul[data-type='taskList'] li > label) {
		flex: 0 0 auto;
		margin-right: 0.5rem;
		user-select: none;
		display: flex;
		align-items: center;
		padding-top: 0.3em;
	}
	:global(.tiptap ul[data-type='taskList'] li > div) {
		flex: 1 1 auto;
	}
	:global(.tiptap ul[data-type='taskList'] input[type='checkbox']) {
		cursor: pointer;
		width: 1.25em;
		height: 1.25em;
	}
	:global(.tiptap ul[data-type='taskList'] li[data-checked='true'] > div > p) {
		text-decoration: line-through;
		opacity: 0.7;
	}

	/* Code block language selector styles */
	:global(.tiptap .code-block-wrapper) {
		position: relative;
	}
	:global(.tiptap .code-block-wrapper pre) {
		background: #0d1117;
		color: #c9d1d9;
		font-family: 'JetBrainsMono', 'Fira Code', monospace;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		margin: 1.5rem 0;
	}
	:global(.tiptap .code-block-wrapper .code-block-language-select) {
		position: absolute;
		right: 0.5rem;
		top: 0.5rem;
		font-size: 0.75rem;
		padding: 2px 6px;
		background-color: var(--color-base-200);
		color: var(--color-base-content);
		border: 1px solid var(--color-base-300);
		border-radius: 4px;
		opacity: 0.5;
		transition: opacity 0.2s;
	}
	:global(.tiptap .code-block-wrapper:hover .code-block-language-select) {
		opacity: 1;
	}

	/* hljs minimal overrides for layout */
	:global(.hljs) {
		background: transparent !important;
		padding: 0 !important;
	}
</style>
