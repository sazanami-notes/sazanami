<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@milkdown/core';
  import { commonmark } from '@milkdown/preset-commonmark';
  import { nord } from '@milkdown/theme-nord';
  import { listener, listenerCtx } from '@milkdown/plugin-listener';

  export let content = '';
  export let onChange: (value: string) => void = () => {};
  
  let editorRef: HTMLDivElement;
  let editor: Editor | null = null;

  onMount(async () => {
    if (!editorRef) return;

    editor = await Editor
      .make()
      .config((ctx) => {
        ctx.set(listenerCtx, {
          markdown: [
            (markdown) => {
              onChange(markdown);
            }
          ]
        });
      })
      .use(nord)
      .use(commonmark)
      .use(listener)
      .create();

    editor.action((ctx) => {
      const view = ctx.get('view');
      if (view) {
        editorRef.appendChild(view.dom);
        if (content) {
          editor?.action((ctx) => {
            const doc = ctx.get('parser')(content);
            const view = ctx.get('view');
            if (doc && view) {
              view.updateState(
                view.state.apply(
                  view.state.tr.replace(0, view.state.doc.content.size, doc)
                )
              );
            }
          });
        }
      }
    });
  });

  onDestroy(() => {
    editor?.destroy();
  });
</script>

<div class="milkdown-editor-container">
  <div bind:this={editorRef} class="milkdown-editor"></div>
</div>

<style>
  .milkdown-editor-container {
    width: 100%;
    height: 100%;
    min-height: 300px;
  }
  
  .milkdown-editor {
    width: 100%;
    height: 100%;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
  }
</style>