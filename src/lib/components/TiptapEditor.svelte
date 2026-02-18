<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import { Markdown } from 'tiptap-markdown';
	import Link from '@tiptap/extension-link';
	import Image from '@tiptap/extension-image';
	import Table from '@tiptap/extension-table';
	import TableRow from '@tiptap/extension-table-row';
	import TableCell from '@tiptap/extension-table-cell';
	import TableHeader from '@tiptap/extension-table-header';

	export let content = '';
	export let editable = true;
	export let placeholder = 'Write something...';

	const dispatch = createEventDispatcher();

	let element: HTMLElement;
	let editor: Editor;

	onMount(() => {
		editor = new Editor({
			element: element,
			editable,
			extensions: [
				StarterKit,
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
				Markdown.configure({
					html: false, // Force markdown output
					transformPastedText: true,
					transformCopiedText: true
				})
			],
			content: content,
			onUpdate: ({ editor }) => {
				const markdown = editor.storage.markdown.getMarkdown();
				dispatch('change', { markdown });
			},
			editorProps: {
				attributes: {
					class:
						'prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none max-w-none min-h-[300px] p-4'
				}
			}
		});
	});

	onDestroy(() => {
		if (editor) {
			editor.destroy();
		}
	});

	$: if (editor && editable !== editor.isEditable) {
		editor.setEditable(editable);
	}

	// Watch for external content changes only if editor is empty or explicit reset needed?
	// For now, we assume one-way init, but if we need to support external updates:
	/*
    $: if (editor && content !== editor.storage.markdown.getMarkdown()) {
       // careful with loops
    }
    */
</script>

<div class="rounded-md border border-gray-300 bg-white shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
    <!-- Toolbar could go here -->
    <!-- <div class="border-b border-gray-200 p-2">Toolbar</div> -->
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
    :global(.tiptap td), :global(.tiptap th) {
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
        content: "";
        left: 0; right: 0; top: 0; bottom: 0;
        background: rgba(200, 200, 255, 0.4);
        pointer-events: none;
    }
</style>
