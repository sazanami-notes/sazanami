import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';

/** YouTubeのURLから動画IDを取り出す（watch / youtu.be / shorts / embed） */
export function getYoutubeId(url: string): string | null {
	const m = url.match(
		/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/
	);
	return m ? m[1] : null;
}

export function isYoutubeUrl(text: string): boolean {
	const trimmed = text.trim();
	return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(trimmed) && !!getYoutubeId(trimmed);
}

/**
 * YouTube埋め込み（クリックで再生）
 * - 普段はサムネイルだけ表示（外部通信は画像1枚のみ・プレイヤーは読み込まない）
 * - クリックすると youtube-nocookie の iframe に差し替え
 * - MarkdownにはURLそのものを保存する（他ツールと相互運用できる）
 */
export const YoutubeNode = Node.create({
	name: 'youtube',
	group: 'block',
	atom: true,
	draggable: true,

	addAttributes() {
		return {
			src: { default: null }
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-youtube-video]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			mergeAttributes(HTMLAttributes, { 'data-youtube-video': '', class: 'youtube-embed' })
		];
	},

	addInputRules() {
		return [
			nodeInputRule({
				find: /^(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s]+)$/,
				type: this.type,
				getAttributes: (match) => ({ src: match[1] })
			})
		];
	},

	addNodeView() {
		return ({ node }) => {
			const wrapper = document.createElement('div');
			wrapper.className = 'youtube-embed-wrapper my-4';
			wrapper.setAttribute('data-youtube-video', '');

			const id = getYoutubeId(node.attrs.src || '');
			if (!id) {
				wrapper.textContent = node.attrs.src || '';
				return { dom: wrapper };
			}

			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'youtube-thumb';
			button.setAttribute('aria-label', 'YouTube動画を再生');
			button.style.cssText =
				'position:relative;display:block;width:100%;max-width:640px;aspect-ratio:16/9;' +
				'border-radius:0.75rem;overflow:hidden;border:1px solid var(--color-base-300);' +
				'background:#000;cursor:pointer;padding:0;';

			const img = document.createElement('img');
			img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
			img.alt = 'YouTube';
			img.loading = 'lazy';
			img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;opacity:0.9;';

			const play = document.createElement('span');
			play.textContent = '▶';
			play.style.cssText =
				'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
				'color:#fff;font-size:2.5rem;text-shadow:0 2px 8px rgba(0,0,0,.6);pointer-events:none;';

			button.appendChild(img);
			button.appendChild(play);

			button.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				const iframe = document.createElement('iframe');
				iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
				iframe.title = 'YouTube';
				iframe.allow =
					'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
				iframe.allowFullscreen = true;
				iframe.style.cssText =
					'display:block;width:100%;max-width:640px;aspect-ratio:16/9;border:0;border-radius:0.75rem;';
				wrapper.replaceChildren(iframe);
			});

			wrapper.appendChild(button);
			return { dom: wrapper };
		};
	},

	// MarkdownにはURLだけを保存する
	renderMarkdown(node) {
		return node.attrs?.src ?? '';
	}
});
