<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/core';
	import { nord } from '@milkdown/theme-nord';
	import { commonmark } from '@milkdown/preset-commonmark';
	import { gfm } from '@milkdown/preset-gfm';
	import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
	import { upload, uploadConfig } from '@milkdown/kit/plugin/upload';
	import type { Node } from '@milkdown/prose/model';

	export let initialContent = '';
	export let editable = true;
	export let showTitle = true;
	export let title = '';

	const dispatch = createEventDispatcher();

	let editorRef: HTMLDivElement;
	let editor: Editor | undefined;
	let fallbackTextarea = false;

	const uploader: Uploader = async (files, schema) => {
		const images: File[] = [];
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			if (!file || !file.type.startsWith('image/')) {
				continue;
			}
			images.push(file);
		}

		const nodes: Node[] = await Promise.all(
			images.map(async (image) => {
				const alt = image.name;
				const formData = new FormData();
				formData.append('file', image);

				const res = await fetch('/api/attachments', {
					method: 'POST',
					body: formData
				});
				const data = await res.json();

				if (data.success) {
					return schema.nodes.image.create({
						src: data.url,
						alt
					});
				}
				// Handle upload failure
				return schema.nodes.text.create({ text: `[Upload failed: ${alt}]` });
			})
		);

		return nodes;
	};

	onMount(() => {
		const init = async () => {
			try {
				const newEditor = await Editor.make()
					.config((ctx) => {
						ctx.set(rootCtx, editorRef);
						ctx.set(defaultValueCtx, initialContent);
						ctx.update(editorViewOptionsCtx, (prev) => ({
							...prev,
							editable: () => editable
						}));
						// Add listener config
						ctx.get(listenerCtx).markdownUpdated((_, markdown, prevMarkdown) => {
							if (markdown !== prevMarkdown) {
								dispatch('change', { markdown });
							}
						});
						// Add upload plugin config
						ctx.update(uploadConfig.key, (prev) => ({
							...prev,
							uploader: uploader
						}));
					})
					.config(nord) // Correct way to apply a theme
					.use(commonmark) // Use the commonmark preset
					.use(gfm)
					.use(listener) // Use the listener plugin
					.use(upload) // Use the upload plugin
					.create();

				editor = newEditor;
			} catch (e) {
				console.error('Error creating Milkdown editor:', e);
				fallbackTextarea = true;
			}
		};
		init();

		return () => {
			if (editor) {
				editor.destroy();
				editor = undefined;
			}
		};
	});

	// This is no longer needed as we are not reacting to external content changes
	// $: if (editor && content !== editor.action((ctx) => ctx.get(defaultValueCtx))) {
	// 	editor.action(replaceAll(content));
	// }

	function handleTextareaInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		// We need to dispatch the change event here as well for the fallback
		dispatch('change', { markdown: target.value });
	}
</script>

<div class="milkdown-editor-container">
	{#if showTitle && title}
		<h2 class="editor-title">{title}</h2>
	{/if}
	{#if fallbackTextarea}
		<textarea
			class="fallback-textarea"
			value={initialContent}
			on:input={handleTextareaInput}
			placeholder="Milkdown editor failed to load. Please use this basic textarea."
		></textarea>
	{:else}
		<div bind:this={editorRef} class="milkdown-editor"></div>
	{/if}
</div>

<style>
	.milkdown-editor-container {
		width: 100%;
		height: 100%;
		min-height: 300px;
		position: relative;
	}

	.milkdown-editor {
		width: 100%;
		height: 100%;
		border: 1px solid #ccc;
		border-radius: 4px;
		padding: 8px;
		background-color: white;
	}

	.fallback-textarea {
		width: 100%;
		height: 100%;
		min-height: 300px;
		border: 1px solid #ccc;
		border-radius: 4px;
		padding: 8px;
		font-family: monospace;
		resize: vertical;
	}
</style>
