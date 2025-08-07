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
  let isEditorReady = false;

  onMount(async () => {
    try {
      if (!editorRef) return;

      console.log('Initializing Milkdown editor...');
      
      editor = await Editor
        .make()
        .config((ctx) => {
          ctx.set(listenerCtx, {
            markdown: [
              (markdown) => {
                console.log('Content changed:', markdown);
                onChange(markdown);
              }
            ]
          });
        })
        .use(nord)
        .use(commonmark)
        .use(listener)
        .create();

      console.log('Editor created successfully');
      
      editor.action((ctx) => {
        const view = ctx.get('view');
        if (view) {
          console.log('Appending editor view to DOM');
          editorRef.appendChild(view.dom);
          
          if (content) {
            console.log('Setting initial content:', content);
            editor?.action((ctx) => {
              const parser = ctx.get('parser');
              if (!parser) {
                console.error('Parser not found');
                return;
              }
              
              const doc = parser(content);
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
          
          isEditorReady = true;
        } else {
          console.error('Editor view not found');
        }
      });
    } catch (error) {
      console.error('Error initializing Milkdown editor:', error);
    }
  });

  onDestroy(() => {
    if (editor) {
      console.log('Destroying editor');
      editor.destroy();
    }
  });
</script>

<div class="milkdown-editor-container">
  <div bind:this={editorRef} class="milkdown-editor"></div>
  {#if !isEditorReady}
    <div class="editor-loading">Loading editor...</div>
  {/if}
</div>

<style>
  .milkdown-editor-container {
    width: 100%;
    height: 100%;
    min-height: 300px;
    position: relative;
  }
  
  .milkdown-editor {
    width: 100%;
    height: 100%;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
    background-color: white;
  }
  
  .editor-loading {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.8);
    z-index: 10;
  }
</style>