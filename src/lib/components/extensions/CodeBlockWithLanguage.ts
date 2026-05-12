import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { type Node as ProseMirrorNode } from '@tiptap/pm/model';

export const CodeBlockWithLanguage = CodeBlockLowlight.extend({
    addNodeView() {
        return ({ node, getPos, editor }) => {
            const dom = document.createElement('div');
            dom.classList.add('code-block-wrapper');
            dom.style.position = 'relative';

            // Language selector
            const select = document.createElement('select');
            select.classList.add('code-block-language-select');
            select.style.position = 'absolute';
            select.style.right = '0.5rem';
            select.style.top = '0.5rem';
            select.style.fontSize = '0.8rem';
            select.style.padding = '2px 5px';
            select.style.borderRadius = '4px';
            select.style.backgroundColor = 'var(--color-base-200, #f3f4f6)';
            select.style.color = 'var(--color-base-content, #1f2937)';
            select.style.border = '1px solid var(--color-base-300, #d1d5db)';
            select.style.outline = 'none';
            select.style.cursor = 'pointer';

            // Add options
            const languages = [
                { value: 'auto', label: 'Auto' },
                { value: 'bash', label: 'Bash' },
                { value: 'c', label: 'C' },
                { value: 'cpp', label: 'C++' },
                { value: 'csharp', label: 'C#' },
                { value: 'css', label: 'CSS' },
                { value: 'go', label: 'Go' },
                { value: 'html', label: 'HTML/XML' },
                { value: 'java', label: 'Java' },
                { value: 'javascript', label: 'JavaScript' },
                { value: 'json', label: 'JSON' },
                { value: 'markdown', label: 'Markdown' },
                { value: 'php', label: 'PHP' },
                { value: 'python', label: 'Python' },
                { value: 'ruby', label: 'Ruby' },
                { value: 'rust', label: 'Rust' },
                { value: 'sql', label: 'SQL' },
                { value: 'typescript', label: 'TypeScript' },
                { value: 'yaml', label: 'YAML' }
            ];

            languages.forEach((lang) => {
                const option = document.createElement('option');
                option.value = lang.value;
                option.innerText = lang.label;
                select.appendChild(option);
            });

            select.value = node.attrs.language || 'auto';

            select.addEventListener('change', (event) => {
                const target = event.target as HTMLSelectElement;
                const parsedPos = typeof getPos === 'function' ? getPos() : undefined;
                if (parsedPos !== undefined) {
                    editor.commands.command(({ tr }) => {
                        tr.setNodeMarkup(parsedPos, undefined, {
                            language: target.value
                        });
                        return true;
                    });
                }
            });

            // Only allow editing the select in editable mode
            select.contentEditable = 'false';

            // Code block structure required by Tiptap (pre > code)
            const contentDOM = document.createElement('pre');
            contentDOM.style.paddingTop = '2rem'; // make room for select
            const codeElement = document.createElement('code');
            contentDOM.appendChild(codeElement);

            dom.appendChild(select);
            dom.appendChild(contentDOM);

            // Hide selector when not editable, or keep it visible based on preference
            // if (!editor.isEditable) {
            //   select.style.display = 'none';
            //   contentDOM.style.paddingTop = '1rem';
            // }

            return {
                dom,
                contentDOM: codeElement,
                update(updatedNode: ProseMirrorNode) {
                    if (updatedNode.type.name !== this.name) {
                        return false;
                    }
                    select.value = updatedNode.attrs.language || 'auto';
                    return true;
                }
            };
        };
    }
});
