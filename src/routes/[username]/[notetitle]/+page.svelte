<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { Milkdown } from '@milkdown/svelte';
  import { commonmark } from '@milkdown/preset-commonmark';

  let editorContent = '';
  let title = '';
  let isEditing = false;
  const { note } = $page.data;

  onMount(() => {
    title = decodeURIComponent(note.title);
    editorContent = note.content;
  });

  const handleSave = async () => {
    const encodedTitle = encodeURIComponent(title);
    const response = await fetch(`/${note.user.name}/${encodedTitle}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editorContent, title })
    });

    if (response.ok) {
      isEditing = false;
      // URLを更新 (ブラウザのhistory APIを使用)
      window.history.replaceState(null, '', `/${note.user.name}/${encodedTitle}`);
    }
  };
</script>

<div class="container mx-auto p-4 max-w-3xl">
  {#if isEditing}
    <div class="mb-4">
      <input 
        type="text" 
        bind:value={title}
        class="input input-bordered w-full text-2xl font-bold mb-4"
        placeholder="タイトルを入力"
      />
      <Milkdown 
        {editorContent}
        {commonmark}
        class="min-h-[500px]"
      />
      <div class="mt-4 flex justify-end gap-2">
        <button on:click={() => isEditing = false} class="btn btn-outline">
          キャンセル
        </button>
        <button on:click={handleSave} class="btn btn-primary">
          保存
        </button>
      </div>
    </div>
  {:else}
    <div class="flex justify-between items-start mb-4">
      <h1 class="text-2xl font-bold">{title}</h1>
      <button on:click={() => isEditing = true} class="btn btn-sm btn-ghost">
        編集
      </button>
    </div>
    <div class="prose max-w-none">
      {@html editorContent}
    </div>
  {/if}
</div>