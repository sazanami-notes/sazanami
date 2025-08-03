<script lang="ts">
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { Milkdown } from '@milkdown/svelte';
  import { commonmark } from '@milkdown/preset-commonmark';

  let title = '';
  let content = '# New Note';
  const { initialContent } = $page.data;

  if (initialContent) {
    content = initialContent;
  }

  const handleSubmit = async () => {
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });

    if (response.ok) {
      const note = await response.json();
      const encodedTitle = encodeURIComponent(title);
      window.location.href = `/${get(page).params.username}/${encodedTitle}`;
    }
  };
</script>

<div class="container mx-auto p-4 max-w-3xl">
  <div class="mb-4">
    <input 
      type="text" 
      bind:value={title}
      class="input input-bordered w-full text-2xl font-bold mb-4"
      placeholder="タイトルを入力"
    />
    <Milkdown 
      {content}
      {commonmark}
      class="min-h-[500px]"
    />
    <div class="mt-4 flex justify-end">
      <button on:click={handleSubmit} class="btn btn-primary">
        作成
      </button>
    </div>
  </div>
</div>