<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
import { onMount, onDestroy } from 'svelte';
import { editorViewCtx, defaultValueCtx, editorCtx, Editor, Ctx } from '@milkdown/core';
import { EditorView } from '@milkdown/prose/view';
import { nord } from '@milkdown/theme-nord';
import { commonmark, headingAttr } from '@milkdown/preset-commonmark';
import { menu } from '@milkdown/plugin-menu';
import { tooltip } from '@milkdown/plugin-tooltip';
import { history } from '@milkdown/plugin-history';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
// import { Atom } from '@milkdown/utils'; // Atomは不要なため削除

// Style imports
import '@milkdown/theme-nord/style.css';
import '@milkdown/plugin-menu/style.css';
import '@milkdown/plugin-tooltip/style.css';
import '@milkdown/preset-commonmark/style.css';

	let editorContainerElement: HTMLDivElement;
	let milkdownEditor: any | null = null; // MilkdownEditorのインスタンスを保持

	// ブロックハンドルとプラスボタンを非表示にするカスタムCSSを定義
	// これらはMilkdownの内部要素に適用されるため、グローバルなstyleタグまたはapp.cssを介して適用
	const customCss = `
	.milkdown-block-handle {
		display: none !important;
	}
	.milkdown.is-focused .milkdown-plus-button {
		display: none !important;
	}

	/* ツールバーを画面下部に固定し、デザインを調整 */
	.milkdown-menu {
		position: fixed;
		bottom: 0;
		left: 0;
		width: 100%;
		background-color: #f0f0f0; /* 背景色を調整 */
		border-top: 1px solid #ccc; /* 上部にボーダーを追加 */
		padding: 8px 16px;
		box-shadow: 0 -2px 5px rgba(0,0,0,0.1); /* 影を追加 */
		z-index: 1000; /* 他の要素の上に表示 */
		display: flex; /* ボタンの配置を調整 */
		justify-content: center; /* 中央揃え */
		flex-wrap: wrap; /* ボタンが多すぎる場合に折り返す */
	}

	.milkdown-menu button {
		margin: 0 4px; /* ボタン間のスペース */
		padding: 6px 10px;
		border: 1px solid #ddd;
		background-color: #fff;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
	}

	.milkdown-menu button:hover {
		background-color: #e0e0e0;
	}
`;

		// editorContainerElementの兄弟要素としてmenuを挿入する関数
	const insertMenu = (root: HTMLElement, menu: HTMLElement) => {
		root.parentNode?.insertBefore(menu, root.nextSibling);
	};

	onMount(() => {
		if (!editorContainerElement) {
			console.error('Editor container element not found!');
			return;
		}

		// カスタムCSSをDOMに注入
		const styleElement = document.createElement('style');
		styleElement.textContent = customCss;
		document.head.appendChild(styleElement);

		Editor.make()
			.config((ctx) => {
				ctx.set(defaultValueCtx, '# Hello, Svelte ⎯ Milkdown! \n\nThis is a simple Milkdown editor running in a Svelte component.');
				ctx.set(editorViewCtx, new EditorView(editorContainerElement));

				// Listener plugin setup
				const listenerManager = ctx.get(listenerCtx);
				listenerManager.markdownUpdated((ctx, markdown, prevMarkdown) => {
					if (markdown !== prevMarkdown) {
						console.log('Markdown updated:', markdown);
						// Your markdown update logic here, e.g., save to state
					}
				});
			})
			.use(nord)
			.use(commonmark)
			.use(menu.configure((options) => {
				return {
					...options,
					insertMenu,
					menubar: [
						{
							flat: true,
							items: [
								// Inline buttons
								{ type: 'bold' },
								{ type: 'italic' },
								{ type: 'strike' },
								{ type: 'code' },
								{ type: 'link' },
								{ type: 'image' },
								{ type: 'hr' }
							]
						},
						{
							flat: true,
							items: [
								// Block buttons
								{ type: 'bulletList' },
								{ type: 'orderedList' },
								{ type: 'taskList' },
								{ type: 'blockquote' },
								{ type: 'codeBlock' },
								{ type: 'table' }
							]
						},
						{
							flat: true,
							items: [
								// Heading buttons
								{ type: 'h1' },
								{ type: 'h2' },
								{ type: 'h3' },
								{ type: 'h4' },
								{ type: 'h5' },
								{ type: 'h6' }
							]
						},
						{
							flat: true,
							items: [
								// History buttons
								{ type: 'undo' },
								{ type: 'redo' }
							]
						}
					]
				};
			}))
			.use(tooltip)
			.use(history)
			.use(listener)
			.create()
			.then((editor) => {
				milkdownEditor = editor;
				console.log('Milkdown editor created!');
			})
			.catch((e: Error) => {
				console.error('Failed to create Milkdown editor:', e);
			});
	});
			// defaultValueは維持
			defaultValue:
				'# Hello, Svelte ⎯ Milkdown! \n\nThis is a Crepe editor running in a Svelte component.'
		});

		milkdownEditor.create().then(() => {
			console.log('Milkdown editor created!');
		}).catch((e: Error) => {
			console.error('Failed to create Milkdown editor:', e);
		});
	});

	// 4. コンポーネントが画面から消える時に、エディタを破棄してメモリリークを防ぐ
	onDestroy(() => {
		if (milkdownEditor) {
			console.log('Destroying Milkdown editor...');
			milkdownEditor.destroy();
		}
	});
</script>

<h1 class="mx-6 my-4 text-lg font-bold">Milkdown</h1>

<div bind:this={editorContainerElement} class="m-4 p-4 shadow-lg"></div>
