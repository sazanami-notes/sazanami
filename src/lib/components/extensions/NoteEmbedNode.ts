import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

marked.use(
    markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        }
    })
);

export const NoteEmbedNode = Node.create({
    name: 'noteEmbed',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            title: {
                default: null,
                parseHTML: (element) => element.getAttribute('title')
            }
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-note-embed]'
            }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-note-embed': '' })];
    },

    addInputRules() {
        return [
            nodeInputRule({
                find: /!\[\[([^\]\n]+)\]\]$/,
                type: this.type,
                getAttributes: (match) => {
                    return { title: match[1] };
                }
            })
        ];
    },

    addNodeView() {
        return ({ node, getPos, editor }) => {
            const dom = document.createElement('div');
            dom.className =
                'note-embed-wrapper border-l-4 border-primary pl-4 py-2 my-4 bg-base-200/30 rounded-r-lg';

            // Non-editable for Tiptap
            dom.contentEditable = 'false';

            const header = document.createElement('div');
            header.className = 'text-xs text-base-content/50 mb-2 font-semibold flex items-center justify-between';

            const titleContainer = document.createElement('div');
            titleContainer.className = 'flex items-center gap-1';

            const iconSpan = document.createElement('span');
            iconSpan.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>`;

            const titleSpan = document.createElement('span');
            titleSpan.textContent = `埋め込み: ${node.attrs.title}`;

            titleContainer.appendChild(iconSpan);
            titleContainer.appendChild(titleSpan);
            header.appendChild(titleContainer);

            const editBtn = document.createElement('button');
            editBtn.textContent = '編集';
            editBtn.className = 'btn btn-xs btn-ghost text-base-content/50 hover:text-base-content';
            editBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (typeof getPos === 'function') {
                    const pos = getPos();
                    if (pos !== undefined) {
                        editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).insertContent(`![[${node.attrs?.title}]]`).run();
                    }
                }
            };
            header.appendChild(editBtn);

            dom.appendChild(header);

            const content = document.createElement('div');
            content.className = 'note-embed-content prose prose-sm max-w-none opacity-80';
            // NOTE: prevent interactions in the embed to avoid cursor trapping or weird editing
            content.style.pointerEvents = 'none';
            content.innerHTML = '<span class="loading loading-dots loading-sm"></span>';
            dom.appendChild(content);

            if (node.attrs.title) {
                fetch(`/api/notes/embed?title=${encodeURIComponent(node.attrs.title)}`)
                    .then((res) => {
                        if (!res.ok) throw new Error('Not found');
                        return res.json();
                    })
                    .then((data) => {
                        // WikiLinkを再帰的に解決するかは一旦スキップし、そのままマークダウンパース
                        content.innerHTML = marked.parse(data.contentHtml || '') as string;
                    })
                    .catch(() => {
                        content.textContent = `ノート「${node.attrs.title}」が見つかりませんでした。`;
                        content.className = 'text-error text-sm mt-2 block';
                    });
            }

            return {
                dom
            };
        };
    },

    // --- @tiptap/markdown v3 integration ---

    markdownTokenizer: {
        name: 'noteEmbed',
        level: 'block' as const,

        start: (src: string) => {
            return src.indexOf('![[');
        },

        tokenize: (src: string, _tokens: any[], _lexer: any) => {
            const match = /^!\[\[(.*?)\]\]/.exec(src);
            if (!match) return undefined;
            return {
                type: 'noteEmbed',
                raw: match[0],
                title: match[1]
            };
        }
    },

    parseMarkdown(token: any, helpers: any) {
        return helpers.createNode('noteEmbed', {
            title: token.title || ''
        });
    },

    renderMarkdown(node: any, _helpers: any, _ctx: any) {
        return `![[${node.attrs?.title || ''}]]\n\n`;
    }
});
