<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { defaultValueCtx, Editor } from '@milkdown/core';
	import { nord } from '@milkdown/theme-nord';
	import { commonmark } from '@milkdown/preset-commonmark';

	// Style imports
	import '@milkdown/theme-nord/style.css';
	// commonmarkのスタイルはテーマに含まれるか、個別に提供されない可能性が高いため削除
	// 以前のplugin-menuやplugin-tooltipのスタイルも削除

	let editorContainerElement: HTMLDivElement;
	let milkdownEditor: Editor | null = null; // MilkdownEditorのインスタンスを保持

	onMount(() => {
		if (!editorContainerElement) {
			console.error('Editor container element not found!');
			return;
		}

		Editor.make()
			.config(nord) // nordテーマをconfigに直接渡す

			.config((ctx) => {
				ctx.set(defaultValueCtx, '# Hello, Svelte ⎯ Milkdown! \n\nThis is a simple Milkdown editor running in a Svelte component.');
				// editorViewCtxの直接設定はMilkdownの内部で処理されるため削除。
				// Listener plugin setupも削除。
			})
			.use(commonmark)
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
<h1 class="mx-6 my-4 text-lg font-bold">Milkdown</h1>

<div>
	<div bind:this={editorContainerElement} class="p-4 shadow-lg" style="height: 500px;"></div>
</div>


