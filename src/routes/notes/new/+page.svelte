<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import type { Note } from '$lib/types';
  import { generateSlug } from '$lib/utils/slug';
  import { get } from 'svelte/store';

  let title = '';
  let content = '';
  let isPublic = false;
  let tags: string[] = [];

  const handleSubmit = async () => {
    const slug = generateSlug(title);
    const sessionData = get(page).data;
    
    const note: Note = {
      id: '',
      userId: sessionData.session?.user?.id || '',
      title,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic,
      tags,
      slug
    };
    
    // API call to create note would go here
    await goto(`/notes/${note.id}/${slug}`);
  };
</script>

<div class="max-w-2xl mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">New Note</h1>
  <form on:submit|preventDefault={handleSubmit}>
    <input
      type="text"
      bind:value={title}
      placeholder="Title"
      class="w-full p-2 mb-4 border rounded"
      required
    />
    <textarea
      bind:value={content}
      placeholder="Content (Markdown)"
      class="w-full p-2 mb-4 border rounded h-64"
      required
    ></textarea>
    <div class="flex items-center mb-4">
      <input type="checkbox" bind:checked={isPublic} id="isPublic" class="mr-2" />
      <label for="isPublic">Public</label>
    </div>
    <button type="submit" class="btn btn-primary">Create Note</button>
  </form>
</div>