<script lang="ts">
	import { onMount, onDestroy, watch } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import { marked } from 'marked';
	import TurndownService from 'turndown';
	import { WikiLink } from '$lib/tiptap/wiki-link';
	import { ImageUpload } from '$lib/tiptap/image-upload';
	import Link from '@tiptap/extension-link';
	import Image from '@tiptap/extension-image';

	export let content = '';
	export let onChange: (value: string) => void = () => {};
	export let editable = true;

	let editorRef: HTMLDivElement;
	let editor: Editor | null = null;
	let turndownService: TurndownService | null = null;

	// To prevent infinite loops, we keep track of the last emitted value.
	let lastEmittedMarkdown = content;

	// Marked extension for WikiLinks
	const wikiLinkExtension = {
		name: 'wikiLink',
		level: 'inline',
		start(src: string) {
			return src.match(/\[\[/)?.index;
		},
		tokenizer(src: string) {
			const rule = /^\[\[([^\]]+)\]\]/;
			const match = rule.exec(src);
			if (match) {
				const text = match[1];
				return {
					type: 'wikiLink',
					raw: match[0],
					text: text,
					href: text
				};
			}
		},
		renderer(token: { href: string; text: string }) {
			return `<span data-type="wiki-link" data-href="${token.href}">${token.text}</span>`;
		}
	};

	marked.use({ extensions: [wikiLinkExtension] });

	onMount(() => {
		turndownService = new TurndownService();
		turndownService.addRule('wikiLink', {
			filter: (node) => {
				return node.nodeName === 'SPAN' && node.getAttribute('data-type') === 'wiki-link';
			},
			replacement: (content, node) => {
				const href = (node as HTMLElement).getAttribute('data-href');
				return `[[${href}]]`;
			}
		});

		editor = new Editor({
			element: editorRef,
			extensions: [
				StarterKit,
				Link.configure({
					// autolink is not compatible with wiki-links
					autolink: false
				}),
				WikiLink,
				Image, // The base image extension
				ImageUpload // Our custom image upload extension
			],
			content: marked.parse(content) as string,
			editable,
			onUpdate: ({ editor }) => {
				const html = editor.getHTML();
				const markdown = turndownService?.turndown(html) || '';
				lastEmittedMarkdown = markdown;
				onChange(markdown);
			}
		});
	});

	onDestroy(() => {
		if (editor) {
			editor.destroy();
		}
	});

	// Watch for external changes to the content prop
	watch(
		() => content,
		(newContent) => {
			if (editor && newContent !== lastEmittedMarkdown) {
				const newHtml = marked.parse(newContent) as string;
				// `setContent` will trigger the `onUpdate` callback.
				// We need to make sure we don't get into a loop.
				// The check against `lastEmittedMarkdown` helps, but we also
				// compare the HTML to be sure.
				if (newHtml !== editor.getHTML()) {
					editor.commands.setContent(newHtml, false);
				}
			}
		}
	);

	// Watch for changes to the editable prop
	watch(
		() => editable,
		(newEditable) => {
			if (editor) {
				editor.setEditable(newEditable);
			}
		}
	);
</script>

<div bind:this={editorRef} class="tiptap-editor" />

<style>
	.tiptap-editor {
		width: 100%;
		height: 100%;
		border: 1px solid #ccc;
		border-radius: 4px;
		padding: 8px;
		background-color: white;
	}
</style>
