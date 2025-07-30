<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	// defaultValueCtxとEditorに加えてrootCtxをインポートします
	import { defaultValueCtx, Editor, rootCtx } from '@milkdown/core';
	import { nord } from '@milkdown/theme-nord';
	import { commonmark } from '@milkdown/preset-commonmark';
	import { wikiLink } from '$lib/milkdown/wiki-link-plugin'; // wikiLinkプラグインをインポート

	// Style imports
	import '@milkdown/theme-nord/style.css';

	let editorContainerElement: HTMLDivElement;
	let milkdownEditor: Editor | null = null;

	onMount(() => {
		if (!editorContainerElement) {
			console.error('Editor container element not found!');
			return;
		}

		Editor.make()
			.config(nord)
			.config((ctx) => {
				// この行を追加して、エディタの描画先を指定します
				ctx.set(rootCtx, editorContainerElement);
				ctx.set(
					defaultValueCtx,
					'# Hello, Sazanami!\n\nThis is a test of [[wiki links]].'
				);
			})
			.use(commonmark)
			.use(wikiLink) // wikiLinkプラグインを使用
			.create()
			.then((editor) => {
				milkdownEditor = editor;
				console.log('Milkdown editor created!');
			})
			.catch((e: Error) => {
				console.error('Failed to create Milkdown editor:', e);
			});
	});

	onDestroy(() => {
		if (milkdownEditor) {
			console.log('Destroying Milkdown editor...');
			milkdownEditor.destroy();
		}
	});
</script>


<div>
	<div bind:this={editorContainerElement} class="p-4" style="height: 500px;">
	</div>
</div>