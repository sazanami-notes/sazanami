<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx, editorViewCtx, parserCtx } from '@milkdown/core';
	import { nord } from '@milkdown/theme-nord';
	import { commonmark } from '@milkdown/preset-commonmark';
	import { gfm } from '@milkdown/preset-gfm';
	import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
	import { upload, uploadConfig, type Uploader } from '@milkdown/kit/plugin/upload';
	import type { Node } from '@milkdown/prose/model';

	let {
		content = $bindable(''),
		editable = true,
		showTitle = true,
		title = '',
		placeholder = '',
		onChange
	}: {
		content?: string | null;
		editable?: boolean;
		showTitle?: boolean;
		title?: string;
		placeholder?: string;
		onChange?: (markdown: string) => void;
	} = $props();

	const dispatch = createEventDispatcher();

	let editorRef: HTMLDivElement | undefined = $state();
	let editor: Editor | undefined = $state();
	let fallbackTextarea = $state(false);
	let lastKnownContent = content || '';

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
                        if (editorRef) {
						    ctx.set(rootCtx, editorRef);
                        }
						ctx.set(defaultValueCtx, content || '');
						ctx.update(editorViewOptionsCtx, (prev) => ({
							...prev,
							editable: () => editable
						}));
						// Add listener config
						ctx.get(listenerCtx).markdownUpdated((_, markdown, prevMarkdown) => {
							if (markdown !== prevMarkdown) {
								lastKnownContent = markdown;
								content = markdown;
								if (onChange) onChange(markdown);
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

	$effect(() => {
        const currentContent = content || '';
		if (editor && currentContent !== lastKnownContent) {
			lastKnownContent = currentContent;
			editor.action((ctx) => {
				const view = ctx.get(editorViewCtx);
				const parser = ctx.get(parserCtx);
				const doc = parser(currentContent);
				if (!doc) return;
				const state = view.state;
				view.dispatch(state.tr.replaceWith(0, state.doc.content.size, doc));
			});
		}
	});

	function handleTextareaInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		lastKnownContent = target.value;
		content = target.value;
		if (onChange) onChange(target.value);
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
			value={content || ''}
			oninput={handleTextareaInput}
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
