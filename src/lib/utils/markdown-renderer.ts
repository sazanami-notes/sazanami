import { Marked, type Renderer, type Tokens } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

export const customMarked = new Marked(
	markedHighlight({
		langPrefix: 'hljs language-',
		highlight(code, lang) {
			const language = hljs.getLanguage(lang) ? lang : 'plaintext';
			return hljs.highlight(code, { language }).value;
		}
	})
);

export const renderer = {
	code(this: Renderer, { text, lang }: Tokens.Code) {
		const language = (lang || '').match(/\S*/)?.[0] || '';
		const codeStr = text;
		const langAttr = language ? ` class="hljs language-${language}"` : ' class="hljs"';

		return `
<div class="code-block-wrapper" style="position: relative; margin: 1.5rem 0;">
	<pre><code${langAttr}>${codeStr}</code></pre>
</div>
`;
	},
	listitem(this: Renderer, token: Tokens.ListItem) {
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
	list(this: Renderer, token: Tokens.List) {
		const items = token.items || [];
		const bodyHtml = items.map((item) => this.listitem(item)).join('');
		const isTaskList =
			items.some((item) => item.task) || (token.raw || '').includes('data-type="taskItem"');

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

export type { Renderer, Tokens };
