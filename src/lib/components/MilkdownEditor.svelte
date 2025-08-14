<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Editor, defaultValueCtx, rootCtx, editorViewOptionsCtx } from '@milkdown/kit/core';
	import { commonmark } from '@milkdown/kit/preset/commonmark';
	import { nord } from '@milkdown/theme-nord';
	import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
	import { upload, uploader } from '@milkdown/kit/plugin/upload';
	import type { Node } from '@milkdown/prose/model';

	export let content = '';
	export let onChange: (value: string) => void = () => {};
	export let editable = true;
	export let showTitle = true;
	export let title = '';

	let editorInstance: Editor | null = null;
	let fallbackTextarea = false;

	async function useEditor(dom: HTMLDivElement) {
		try {
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
						return schema.nodes.text.create({ text: `[Upload failed: ${alt}]` });
					})
				);
				return nodes;
			});

			const editor = await Editor.make()
				.config((ctx) => {
					ctx.set(rootCtx, dom);
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
				.config(nord)
				.use(commonmark)
				.use(listener)
				.use(upload.configure(fileUploader))
				.create();

			editorInstance = editor;
		} catch (e) {
			console.error('Failed to create Milkdown editor:', e);
			fallbackTextarea = true;
		}

		return {
			destroy: () => {
				if (editorInstance) {
					editorInstance.destroy();
					editorInstance = null;
				}
			}
		};
	}

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
		/>
	{:else}
		<div use:useEditor class="milkdown-editor" />
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
		overflow-y: auto;
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
