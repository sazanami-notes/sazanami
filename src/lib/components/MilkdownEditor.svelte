<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Editor } from '@milkdown/core';
	import type { Node } from '@milkdown/prose/model';

	export let content = '';
	export let onChange: (value: string) => void = () => {};
	export let editable = true; // Add editable prop
	export let showTitle = true; // Prop to control title visibility
	export let title = ''; // Prop for the title

	let editorRef: HTMLDivElement;
	let editor: Editor | null = null;
	let isEditorReady = false;
	let fallbackTextarea = false;

	onMount(async () => {
		try {
			if (!editorRef) return;

			console.log('Initializing Milkdown editor...');

			// Set a timeout to ensure editor is marked as ready even if there's an issue
			const timeoutId = setTimeout(() => {
				if (!isEditorReady) {
					console.warn('Editor initialization timed out, switching to fallback textarea');
					isEditorReady = true;
					fallbackTextarea = true;
				}
			}, 3000);

			try {
				const { Editor, defaultValueCtx, rootCtx, editorViewOptionsCtx } = await import(
					'@milkdown/core'
				);
				const { commonmark } = await import('@milkdown/preset-commonmark');
				const { nord } = await import('@milkdown/theme-nord');
				const { listener, listenerCtx } = await import('@milkdown/plugin-listener');
				const { upload, uploader } = await import('@milkdown/plugin-upload');

				// Uploader function
				const fileUploader = uploader(async (files, schema) => {
					const images: File[] = [];
					for (let i = 0; i < files.length; i++) {
						const file = files[i];
						if (file.type.startsWith('image/')) {
							images.push(file);
						}
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
							// Handle upload failure if needed
							return schema.nodes.text.create({ text: `[Upload failed: ${alt}]` });
						})
					);
					return nodes;
				});

				editor = await Editor.make()
					.config((ctx) => {
						ctx.set(rootCtx, editorRef);
						ctx.set(defaultValueCtx, content);
						ctx.update(editorViewOptionsCtx, (prev) => ({
							...prev,
							editable: () => editable
						}));
						ctx.set(listenerCtx, {
							markdown: [
								(markdown) => {
									onChange(markdown);
								}
							]
						});
					})
					.use(nord)
					.use(commonmark)
					.use(listener)
					.use(
						upload.configure(fileUploader, {
							// configure options if needed
						})
					)
					.create();

				console.log('Editor created successfully');

				// Clear the timeout since editor was created successfully
				clearTimeout(timeoutId);

				// Set editor as ready
				isEditorReady = true;
			} catch (err) {
				console.error('Failed to create editor:', err);
				clearTimeout(timeoutId);
				isEditorReady = true;
				fallbackTextarea = true;
			}
		} catch (error) {
			console.error('Error in Milkdown component:', error);
			isEditorReady = true;
			fallbackTextarea = true;
		}
	});

	onDestroy(() => {
		if (editor) {
			try {
				console.log('Destroying editor');
				editor.destroy();
			} catch (err) {
				console.error('Error destroying editor:', err);
			}
		}
	});

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
		<!-- Fallback textarea when Milkdown fails to load -->
		<textarea
			class="fallback-textarea"
			value={content}
			on:input={handleTextareaInput}
			placeholder="Enter your content here..."
		></textarea>
	{:else}
		<div bind:this={editorRef} class="milkdown-editor"></div>
		{#if !isEditorReady}
			<div class="editor-loading">Loading editor...</div>
		{/if}
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
