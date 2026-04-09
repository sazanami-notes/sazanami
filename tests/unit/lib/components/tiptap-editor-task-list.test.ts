// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { Markdown } from '@tiptap/markdown';

const editors: Editor[] = [];

function createTaskEditor() {
	const element = document.createElement('div');
	document.body.appendChild(element);

	const editor = new Editor({
		element,
		content: '- [ ] oooo',
		contentType: 'markdown',
		extensions: [
			StarterKit.configure({ codeBlock: false }),
			TaskList,
			TaskItem.configure({ nested: true }),
			Markdown
		]
	});

	editors.push(editor);
	return editor;
}

afterEach(() => {
	while (editors.length > 0) {
		editors.pop()?.destroy();
	}
	document.body.innerHTML = '';
});

describe('Tiptap task list Enter behavior', () => {
	it('keeps the next line as a task item when Enter is pressed', async () => {
		const editor = createTaskEditor();

		editor.commands.focus('end');
		editor.view.dom.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'Enter',
				code: 'Enter',
				bubbles: true,
				cancelable: true
			})
		);

		await new Promise((resolve) => setTimeout(resolve, 0));

		const html = editor.getHTML();

		expect((html.match(/data-type="taskItem"/g) || []).length).toBe(2);
		expect(html).toContain('oooo');
	});

	it('exits the task list when Enter is pressed on an empty task item', async () => {
		const editor = createTaskEditor();

		editor.commands.focus('end');

		const pressEnter = () =>
			editor.view.dom.dispatchEvent(
				new KeyboardEvent('keydown', {
					key: 'Enter',
					code: 'Enter',
					bubbles: true,
					cancelable: true
				})
			);

		pressEnter();
		await new Promise((resolve) => setTimeout(resolve, 0));

		pressEnter();
		await new Promise((resolve) => setTimeout(resolve, 0));

		const html = editor.getHTML();

		expect((html.match(/data-type="taskItem"/g) || []).length).toBe(1);
		expect(html).toContain('<p></p>');
	});

	it('keeps task item semantics after markdown round-trip', async () => {
		const editor = createTaskEditor();

		editor.commands.focus('end');
		editor.view.dom.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'Enter',
				code: 'Enter',
				bubbles: true,
				cancelable: true
			})
		);

		await new Promise((resolve) => setTimeout(resolve, 0));

		const markdown = editor.getMarkdown();
		editor.commands.setContent(markdown, { contentType: 'markdown' });

		const html = editor.getHTML();

		expect((html.match(/data-type="taskItem"/g) || []).length).toBe(2);
	});
});