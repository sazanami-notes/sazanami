<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Note } from '$lib/types';
	import { Marked } from 'marked';
	import { markedHighlight } from 'marked-highlight';
	import hljs from 'highlight.js';
	import { renderWikiLinks } from '$lib/utils/note-utils';

	export let note: Note;
	export let linkToDetail = false; // Default to false for modal behavior

	const dispatch = createEventDispatcher<{ edit: Note }>();

	type EmbedPlaceholder = {
		placeholder: string;
		title: string;
	};

	const customMarked = new Marked(
		markedHighlight({
			langPrefix: 'hljs language-',
			highlight(code, lang) {
				const language = hljs.getLanguage(lang) ? lang : 'plaintext';
				return hljs.highlight(code, { language }).value;
			}
		})
	);

	const renderer = {
		code(this: any, { text, lang }: { text: string; lang?: string }) {
			const language = (lang || '').match(/\S*/)?.[0] || '';
			const codeStr = text;
			const langAttr = language ? ` class="hljs language-${language}"` : ' class="hljs"';

			return `
<div class="code-block-wrapper" style="position: relative; margin: 1.5rem 0;">
	<pre><code${langAttr}>${codeStr}</code></pre>
</div>
`;
		},
		listitem(this: any, token: any) {
			const { text, task, checked, tokens } = token;
			if (task) {
				const checkbox = `<input type="checkbox" ${checked ? 'checked="" ' : ''}style="cursor: pointer; width: 1em; height: 1em; accent-color: var(--color-primary); margin: 0;">`;
				const checkedAttr = checked ? 'data-checked="true"' : 'data-checked="false"';
				const content = (text || '').replace(/^\[[ xX]\]\s*/, '');
				return `<li data-type="taskItem" ${checkedAttr} style="display: flex; align-items: flex-start; margin-bottom: 0.25rem; padding-left: 0;"><label style="flex: 0 0 auto; margin-right: 0.5rem; user-select: none; display: flex; align-items: center; padding-top: 0; margin-top: 0.1rem;">${checkbox}</label><div style="flex: 1 1 auto;"><p style="margin: 0 !important;">${content}</p></div></li>\n`;
			}
			const content = tokens && tokens.length > 0 ? customMarked.parser(tokens) : text;
			return `<li>${content}</li>\n`;
		},
		list(this: any, token: any) {
			const items = token.items || [];
			const bodyHtml = items.map((item: any) => this.listitem(item)).join('');
			const isTaskList =
				items.some((item: any) => item.task) || (token.raw || '').includes('data-type="taskItem"');

			if (isTaskList) {
				return `<ul data-type="taskList" class="contains-task-list" style="list-style: none; padding: 0; margin: 0; list-style-type: none !important; padding-left: 0 !important;">\n${bodyHtml}</ul>\n`;
			}

			const type = token.ordered ? 'ol' : 'ul';
			const startAttr =
				token.ordered && token.start !== 1 && token.start !== undefined
					? ` start="${token.start}"`
					: '';
			return `<${type}${startAttr}>\n${bodyHtml}</${type}>\n`;
		}
	};

	customMarked.use({ gfm: true, renderer });

	function escapeHtml(value: string) {
		return value
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function escapeMarkdownText(value: string) {
		return value.replace(/\\/g, '\\\\').replace(/\]/g, '\\]').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
	}

	function protectNoteEmbeds(contentHtml: string) {
		const embeds: EmbedPlaceholder[] = [];
		const protectedContent = content.replace(/!\[\[(.*?)\]\]/g, (_match, title) => {
			const placeholder = `__SAZANAMI_NOTE_EMBED_${embeds.length}__`;
			embeds.push({ placeholder, title });
			return placeholder;
		});

		return { contentHtml: protectedContent, embeds };
	}

	function restoreNoteEmbeds(contentHtml: string, embeds: EmbedPlaceholder[]) {
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

	$: noteEmbedsProtected = protectNoteEmbeds(note.contentHtml || '');
	$: processedContent = renderWikiLinks(noteEmbedsProtected.content, note.resolvedLinks);
	$: contentWithEmbeds = restoreNoteEmbeds(processedContent, noteEmbedsProtected.embeds);
	$: isHtmlContent = /<p>|<h[1-6]>|<ul|<ol|<blockquote|<pre|<div/i.test(contentWithEmbeds || '');
	$: renderedContent = isHtmlContent ? contentWithEmbeds || '' : customMarked.parse(contentWithEmbeds || '', { breaks: true });

	function enhanceProseContent(node: HTMLElement, _contentHtml: string) {
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
						return res.json();
					})
					.then((data) => {
						content.innerHTML = customMarked.parse(data.contentHtml || '', { breaks: true }) as string;
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
			{@html renderedContent}
		</div>
		<div class="flex flex-wrap gap-1">
			{#each note.tags as tag}
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
			{@html renderedContent}
		</div>
		<div class="flex flex-wrap gap-1">
			{#each note.tags as tag}
				<span class="badge badge-sm badge-ghost">{tag}</span>
			{/each}
		</div>
	</div>
{/if}
