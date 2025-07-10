<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Crepe } from '@milkdown/crepe';

	// CSSのインポートはscriptタグ内で行います
	import '@milkdown/crepe/theme/common/style.css';
	/**
	 * 利用可能なテーマ:
	 * frame, classic, nord
	 * frame-dark, classic-dark, nord-dark
	 */
	import '@milkdown/crepe/theme/frame.css';

	// --- Svelteで実装するための準備 ---

	// 1. TipTapの時と同じく、エディタを描画するためのdiv要素を束縛する変数を用意
	let editorContainerElement: HTMLDivElement;

	// 2. Crepeのインスタンスを保持する変数を用意
	let crepe: Crepe | null = null;

	// 3. コンポーネントが画面に表示された後で、エディタを初期化
	onMount(() => {
		// この時点では、`editorContainerElement`に実際のdiv要素が入っている
		crepe = new Crepe({
			// CSSセレクターの代わりに、束縛した要素を直接渡す
			root: editorContainerElement,
			defaultValue:
				'# Hello, Svelte ⎯ Milkdown! \n\nThis is a Crepe editor running in a Svelte component.'
		});

		crepe.create().then(() => {
			console.log('Milkdown Crepe editor created!');
		});
	});

	// 4. コンポーネントが画面から消える時に、エディタを破棄してメモリリークを防ぐ
	onDestroy(() => {
		if (crepe) {
			console.log('Destroying Milkdown Crepe editor...');
			crepe.destroy();
		}
	});
</script>

<h1 class="mx-6 my-4 text-lg font-bold">Milkdown</h1>

<div bind:this={editorContainerElement} class="m-4 p-4 shadow-lg"></div>
