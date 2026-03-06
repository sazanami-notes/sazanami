import { Mark, mergeAttributes } from '@tiptap/core';

export interface WikiLinkOptions {
    HTMLAttributes: Record<string, any>;
}

export const WikiLinkMark = Mark.create<WikiLinkOptions>({
    name: 'wikiLink',

    addOptions() {
        return {
            HTMLAttributes: {
                class: 'wiki-link-mark',
                'data-wiki-link': 'true'
            }
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-wiki-link="true"]'
            },
            {
                tag: 'a[data-wiki-link]' // 既存のレンダリング済みリンクもパースできるように
            }
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
            0
        ];
    }
});
