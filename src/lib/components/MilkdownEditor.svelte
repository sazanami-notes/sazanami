<script lang="ts">
	import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/core';
	import { nord } from '@milkdown/theme-nord';
	import { commonmark } from '@milkdown/preset-commonmark';
	import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
	import { upload, uploadConfig, Uploader } from '@milkdown/kit/plugin/upload';
	import type { Node } from '@milkdown/prose/model';

	export let content = '';
	export let onChange: (markdown: string) => void = () => {};
	export let editable = true;
	export let showTitle = true;
	export let title = '';

	let dom: HTMLDivElement;
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

	// Svelte Action to create and manage the editor instance
	const initializeEditor = async (node: HTMLDivElement) => {
		try {
			const newEditor = await Editor.make()
				.config((ctx) => {
					ctx.set(rootCtx, node);
					ctx.set(defaultValueCtx, content);
					ctx.update(editorViewOptionsCtx, (prev) => ({
						...prev,
						editable: () => editable
					}));
					// Add listener config
					ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
						onChange(markdown);
					});
					// Add upload plugin config
					ctx.update(uploadConfig.key, (prev) => ({
						...prev,
						uploader: uploader
					}));
				})
				.config(nord) // Correct way to apply a theme
				.use(commonmark) // Use the commonmark preset
				.use(listener) // Use the listener plugin
				.use(upload) // Use the upload plugin
				.create();

			editor = newEditor;
		} catch (e) {
			console.error('Error creating Milkdown editor:', e);
			fallbackTextarea = true;
		}

		return {
			destroy: () => {
				if (editor) {
					editor.destroy();
					editor = undefined;
				}
			}
		};
	};

	function handleTextareaInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		content = target.value;
		onChange(content);
	}
</script>

<div class="milkdown-editor-container">
	{#if showTitle && title}
		<h2 class="editor-title">{title}</h2>
	{/if}
	{#if fallbackTextarea}
		<textarea
			class="fallback-textarea"
			value={content}
			on:input={handleTextareaInput}
			placeholder="Milkdown editor failed to load. Please use this basic textarea."
		></textarea>
	{:else}
		<div use:initializeEditor class="milkdown-editor" bind:this={dom} />
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
		overflow: auto;
	}

	:global(.milkdown-editor .ProseMirror) {
		height: 100%;
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

	.editor-loading {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgba(255, 255, 255, 0.8);
		z-index: 10;
	}
</style>
