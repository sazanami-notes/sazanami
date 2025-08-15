import { Node, mergeAttributes, InputRule, PasteRule } from '@tiptap/core';

export interface WikiLinkOptions {
	HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		wikiLink: {
			/**
			 * Set a wiki link
			 */
			setWikiLink: (attributes: { href: string }) => ReturnType;
			/**
			 * Toggle a wiki link
			 */
			toggleWikiLink: (attributes: { href: string }) => ReturnType;
			/**
			 * Unset a wiki link
			 */
			unsetWikiLink: () => ReturnType;
		};
	}
}

export const WikiLink = Node.create<WikiLinkOptions>({
	name: 'wikiLink',
	group: 'inline',
	inline: true,
	selectable: false,
	atom: true,

	addAttributes() {
		return {
			href: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-href'),
				renderHTML: (attributes) => {
					if (!attributes.href) {
						return {};
					}

					return {
						'data-href': attributes.href
					};
				}
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-type="wiki-link"]'
			}
		];
	},

	renderHTML({ node, HTMLAttributes }) {
		return [
			'span',
			mergeAttributes({ 'data-type': 'wiki-link' }, this.options.HTMLAttributes, HTMLAttributes),
			`[[${node.attrs.href}]]`
		];
	},

	renderText({ node }) {
		return `[[${node.attrs.href}]]`;
	},

	addCommands() {
		return {
			setWikiLink:
				(attributes) =>
				({ commands }) => {
					return commands.setNode(this.name, attributes);
				},
			toggleWikiLink:
				(attributes) =>
				({ commands }) => {
					return commands.toggleNode(this.name, 'paragraph', attributes);
				},
			unsetWikiLink:
				() =>
				({ commands }) => {
					return commands.unsetNode(this.name);
				}
		};
	},

	addInputRules() {
		return [
			new InputRule({
				find: /\[\[([^[\]]+)\]\]$/,
				handler: ({ range, match, commands }) => {
					const [, href] = match;
					const { from } = range;
					const to = from + match[0].length;

					commands.replaceWith(from, to, this.type, { href });
				}
			})
		];
	},

	addPasteRules() {
		return [
			new PasteRule({
				find: /\[\[([^[\]]+)\]\]/g,
				handler: ({ match, chain, range }) => {
					const [, href] = match;
					const { from, to } = range;

					chain().replaceWith(from, to, this.type, { href }).run();
				}
			})
		];
	}
});
