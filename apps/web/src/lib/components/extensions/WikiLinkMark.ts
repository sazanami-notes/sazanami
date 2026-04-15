import { Mark, mergeAttributes } from '@tiptap/core';

export interface WikiLinkOptions {
    HTMLAttributes: Record<string, any>;
}

export const WikiLinkMark = Mark.create<WikiLinkOptions>({
    name: 'wikiLink',

    addOptions() {
        return {
            HTMLAttributes: {
                class: 'wiki-link font-medium text-primary hover:underline cursor-pointer transition-colors',
                'data-wiki-link': 'true'
            }
        };
    },

    parseHTML() {
        return [
            { tag: 'a[data-wiki-link]' },
            { tag: 'span[data-wiki-link]' }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['a', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },

    // --- @tiptap/markdown v3 integration ---

    markdownTokenizer: {
        name: 'wikiLink',
        level: 'inline' as const,

        start: (src: string) => {
            // Don't match ![[  (that's noteEmbed)
            const idx = src.indexOf('[[');
            if (idx < 0) return -1;
            if (idx > 0 && src[idx - 1] === '!') {
                // skip ![[, look for the next [[
                const rest = src.slice(idx + 2);
                const next = rest.indexOf('[[');
                if (next < 0) return -1;
                const nextIdx = idx + 2 + next;
                if (nextIdx > 0 && src[nextIdx - 1] === '!') return -1;
                return nextIdx;
            }
            return idx;
        },

        tokenize: (src: string, _tokens: any[], _lexer: any) => {
            // Don't match ![[
            if (src.startsWith('![[')) return undefined;
            const match = /^\[\[(.*?)\]\]/.exec(src);
            if (!match) return undefined;
            return {
                type: 'wikiLink',
                raw: match[0],
                text: match[1]
            };
        }
    },

    parseMarkdown(token: any, helpers: any) {
        return helpers.applyMark('wikiLink', [helpers.createTextNode(token.text || '')]);
    },

    renderMarkdown(node: any, helpers: any, _ctx: any) {
        return `[[${helpers.renderChildren(node)}]]`;
    }
});
