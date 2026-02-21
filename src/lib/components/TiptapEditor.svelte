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
				StarterKit,
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
				TableCell
			],
			content: content,
			editorProps: {
				attributes: {
					class:
						'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[300px] p-4'
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
	class="focus-within:border-primary focus-within:ring-primary rounded-md border border-gray-300 bg-white shadow-sm focus-within:ring-1"
>
	<div bind:this={element} class="w-full"></div>
</div>

<style>
	:global(.tiptap p.is-editor-empty:first-child::before) {
		color: #adb5bd;
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
		border: 2px solid #ced4da;
		padding: 3px 5px;
		vertical-align: top;
		box-sizing: border-box;
		position: relative;
	}
	:global(.tiptap th) {
		font-weight: bold;
		text-align: left;
		background-color: #f1f3f5;
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
