<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Note } from '$lib/types';
	import hljs from 'highlight.js';
	import { renderWikiLinks } from '$lib/utils/note-utils';
	import { sanitizeHtml, escapeHtml } from '$lib/utils/sanitize';
	import { customMarked } from '$lib/utils/markdown-renderer';

	export let note: Note;
	export let linkToDetail = false; // Default to false for modal behavior

	const dispatch = createEventDispatcher<{ edit: Note }>();

	type EmbedPlaceholder = {
		placeholder: string;
		title: string;
	};

	function escapeMarkdownText(value: string) {
		return value
			.replace(/\\/g, '\\\\')
			.replace(/\]/g, '\\]')
			.replace(/\(/g, '\\(')
			.replace(/\)/g, '\\)');
	}

	function protectNoteEmbeds(content: string) {
		const embeds: EmbedPlaceholder[] = [];
		const protectedContent = content.replace(/!\[\[(.*?)\]\]/g, (_match, title) => {
			const placeholder = `__SAZANAMI_NOTE_EMBED_${embeds.length}__`;
			embeds.push({ placeholder, title });
			return placeholder;
		});

		return { contentHtml: protectedContent, embeds };
	}

	function restoreNoteEmbeds(content: string, embeds: EmbedPlaceholder[]) {
		let restored = content;
		for (const embed of embeds) {
			const linkText = `埋め込み: ${escapeMarkdownText(embed.title)}`;
			const encodedTitle = encodeURIComponent(embed.title);
			restored = restored.replace(embed.placeholder, `[${linkText}](note-embed:${encodedTitle})`);
		}
		return restored;
	}

	function handleClick() {
		if (!linkToDetail && note.id) {
			dispatch('edit', note);
		}
	}

	$: noteEmbedsProtected = protectNoteEmbeds(note.content || '');
	$: processedContent = renderWikiLinks(noteEmbedsProtected.contentHtml, note.resolvedLinks);
	$: contentWithEmbeds = restoreNoteEmbeds(processedContent, noteEmbedsProtected.embeds);
	$: isHtmlContent = /<p>|<h[1-6]>|<ul|<ol|<blockquote|<pre|<div/i.test(contentWithEmbeds || '');
	$: renderedContent = isHtmlContent
		? sanitizeHtml(contentWithEmbeds || '')
		: sanitizeHtml(customMarked.parse(contentWithEmbeds || '', { breaks: true }) as string);

	function enhanceProseContent(node: HTMLElement, _options?: unknown) {
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

			node.querySelectorAll('a[href^="note-embed:"]').forEach((anchor) => {
				const embedLink = anchor as HTMLAnchorElement;
				if (embedLink.hasAttribute('data-embed-bound')) return;
				embedLink.setAttribute('data-embed-bound', 'true');

				const href = embedLink.getAttribute('href') || '';
				const title = decodeURIComponent(href.replace('note-embed:', ''));
				const wrapper = document.createElement('div');
				wrapper.className =
					'note-embed-wrapper border-l-4 border-primary pl-4 py-2 my-4 bg-base-200/30 rounded-r-lg';
				wrapper.innerHTML = `
					<div class="text-xs text-base-content/50 mb-2 font-semibold flex items-center justify-between">
						<div class="flex items-center gap-1">
							<span>🔗</span>
							<span>埋め込み: ${escapeHtml(title)}</span>
						</div>
					</div>
					<div class="note-embed-content prose prose-sm max-w-none opacity-80">
						<span class="loading loading-dots loading-sm"></span>
					</div>
				`;

				const content = wrapper.querySelector('.note-embed-content') as HTMLElement | null;
				embedLink.replaceWith(wrapper);

				if (!content || !title) return;

				fetch(`/api/notes/embed?title=${encodeURIComponent(title)}`)
					.then((res) => {
						if (!res.ok) throw new Error('Not found');
						return res.json() as Promise<{ content?: string }>;
					})
					.then((data) => {
						const parsed = customMarked.parse(data.content || '', { breaks: true }) as string;
						content.innerHTML = sanitizeHtml(parsed);
					})
					.catch(() => {
						content.textContent = `ノート「${title}」が見つかりませんでした。`;
						content.className = 'text-error text-sm mt-2 block';
					});
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
	<div
		class="card bg-base-200 rounded-box block max-h-64 min-h-48 cursor-pointer overflow-hidden p-4 shadow-md transition-shadow hover:shadow-lg"
		onclick={(e) => {
			// WikiLinkへのクリックなら親の遷移を無視する
			if ((e.target as HTMLElement).closest('a.wiki-link')) return;
			if (note.id) goto(`/home/note/${note.id}`);
		}}
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Enter' && note.id) goto(`/home/note/${note.id}`);
		}}
	>
		<h2 class="card-title mb-2 line-clamp-1 text-lg font-bold">{note.title}</h2>
		<div
			class="prose text-base-content/70 mb-3 line-clamp-4 text-sm"
			use:enhanceProseContent={processedContent}
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html renderedContent}
		</div>
		<div class="flex flex-wrap gap-1">
			{#each note.tags as tag (tag)}
				<span class="badge badge-sm badge-ghost">{tag}</span>
			{/each}
		</div>
		</div>
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
			use:enhanceProseContent={processedContent}
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html renderedContent}
		</div>
		<div class="flex flex-wrap gap-1">
			{#each note.tags as tag (tag)}
				<span class="badge badge-sm badge-ghost">{tag}</span>
			{/each}
		</div>
		</div>
		{/if}
