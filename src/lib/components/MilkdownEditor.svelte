<script lang="ts">
  import { onMount } from 'svelte';

  export let content = '';
  export let onChange: (value: string) => void = () => {};
  
  // Always use textarea for now to ensure functionality
  let textareaValue = content;
  
  // Update the content when the textarea changes
  function handleTextareaInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    textareaValue = target.value;
    content = textareaValue;
    onChange(textareaValue);
  }
  
  // Update the textarea when the content prop changes
  $: {
    if (content !== textareaValue) {
      textareaValue = content;
    }
  }
  
  onMount(() => {
    console.log('Simple editor mounted with content length:', content.length);
  });
</script>

<div class="editor-container">
  <textarea 
    class="markdown-textarea" 
    bind:value={textareaValue} 
    on:input={handleTextareaInput}
    placeholder="Enter your content here..."
  ></textarea>
</div>

<style>
  .editor-container {
    width: 100%;
    height: 100%;
    min-height: 300px;
    position: relative;
  }
  
  .markdown-textarea {
    width: 100%;
    height: 100%;
    min-height: 300px;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
    font-family: monospace;
    resize: vertical;
  }
</style>