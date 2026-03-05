<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Note } from '$lib/types';
	import { marked } from 'marked';
	import { markedHighlight } from 'marked-highlight';
	import hljs from 'highlight.js';

	export let note: Note;
	export let linkToDetail = false; // Default to false for modal behavior

	const dispatch = createEventDispatcher<{ edit: Note }>();

	function handleClick() {
		if (!linkToDetail && note.id) {
			dispatch('edit', note);
		}
	}

	$: renderedContent = marked(note.content || '');

	// Configure marked to use highlight.js and wrap code blocks correctly
	marked.use(
		markedHighlight({
			langPrefix: 'hljs language-',
			highlight(code, lang) {
				const language = hljs.getLanguage(lang) ? lang : 'plaintext';
				return hljs.highlight(code, { language }).value;
			}
		})
	);

	const renderer = new marked.Renderer();
	renderer.code = function ({ text, lang }) {
		const language = (lang || '').match(/\S*/)?.[0] || '';
		const codeStr = text;
		const langAttr = language ? ` class="hljs language-${language}"` : ' class="hljs"';

		return `
<div class="code-block-wrapper" style="position: relative; margin: 1.5rem 0;">
	<pre><code${langAttr}>${codeStr}</code></pre>
</div>
`;
	};
	marked.use({ gfm: true, renderer });

	function enhanceProseContent(node: HTMLElement, _content: string) {
		const applyEnhancements = () => {
			if (!node) return;
			node.querySelectorAll('pre').forEach((pre) => {
				if (!pre.parentElement?.classList.contains('code-block-wrapper')) {
					const wrapper = document.createElement('div');
					wrapper.className = 'code-block-wrapper';
					wrapper.style.position = 'relative';
					wrapper.style.margin = '1.5rem 0';
					pre.parentNode?.insertBefore(wrapper, pre);
					wrapper.appendChild(pre);
				}
			});

			node.querySelectorAll('.code-block-wrapper').forEach((wrapper) => {
				const block = wrapper.querySelector('pre code');
				if (block) {
					if (!block.classList.contains('hljs') && !block.hasAttribute('data-highlighted')) {
						hljs.highlightElement(block as HTMLElement);
						block.classList.add('hljs');
					}

					if (!wrapper.querySelector('.copy-code-btn')) {
						wrapper.classList.add('group');

						const button = document.createElement('button');
						button.className =
							'copy-code-btn btn btn-xs btn-square absolute right-2 top-2 opacity-0 transition-opacity z-10 bg-base-200/50 text-base-content hover:bg-base-300 border-none group-hover:opacity-100 backdrop-blur-sm';

						const copyIcon =
							'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
						const checkIcon =
							'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-success"><polyline points="20 6 9 17 4 12"></polyline></svg>';

						button.innerHTML = copyIcon;
						button.title = 'コードをコピー';

						button.onclick = async (e) => {
							e.stopPropagation();
							try {
								await navigator.clipboard.writeText(block.textContent || '');
								button.innerHTML = checkIcon;
								setTimeout(() => {
									if (button) button.innerHTML = copyIcon;
								}, 2000);
							} catch (err) {
								console.error('Failed to copy text: ', err);
							}
						};
						wrapper.appendChild(button);
					}
				}
			});
		};
		setTimeout(applyEnhancements, 0);
		return {
			update() {
				setTimeout(applyEnhancements, 0);
			}
		};
	}
</script>

{#if linkToDetail}
	<a
		href={note.id ? `/home/note/${note.id}` : undefined}
		class="card bg-base-200 rounded-box block max-h-64 min-h-48 overflow-hidden p-4 shadow-md transition-shadow hover:shadow-lg"
	>
		<h2 class="card-title mb-2 line-clamp-1 text-lg font-bold">{note.title}</h2>
		<div
			class="prose text-base-content/70 mb-3 line-clamp-4 text-sm"
			use:enhanceProseContent={note.content}
		>
			{@html renderedContent}
		</div>
		<div class="flex flex-wrap gap-1">
			{#each note.tags as tag}
				<span class="badge badge-sm badge-ghost">{tag}</span>
			{/each}
		</div>
	</a>
{:else}
	<div
		class="card bg-base-200 rounded-box max-h-64 min-h-48 cursor-pointer overflow-hidden p-4 shadow-md transition-shadow hover:shadow-lg"
		onclick={handleClick}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && handleClick()}
		aria-label="メモを編集"
	>
		<h2 class="card-title mb-2 line-clamp-1 text-lg font-bold">{note.title}</h2>
		<div
			class="prose text-base-content/70 mb-3 line-clamp-4 text-sm"
			use:enhanceProseContent={note.content}
		>
			{@html renderedContent}
		</div>
		<div class="flex flex-wrap gap-1">
			{#each note.tags as tag}
				<span class="badge badge-sm badge-ghost">{tag}</span>
			{/each}
		</div>
	</div>
{/if}
