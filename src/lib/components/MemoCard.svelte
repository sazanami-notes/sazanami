<script lang="ts">
  import type { Note } from '$lib/types';
  export let note: Note;
  export let username: string;
  let isHovered = false;
</script>

<div
  class="card bg-base-100 shadow-md hover:shadow-lg transition-shadow rounded-box overflow-hidden"
  class:cursor-pointer={note.id}
  on:mouseenter={() => (isHovered = true)}
  on:mouseleave={() => (isHovered = false)}
  role="region"
  aria-label="メモカード"
>
  <a
    href={note.id ? `/${username}/${encodeURIComponent(note.title)}` : undefined}
    class="block p-4"
  >
    <h2 class="card-title text-lg font-bold mb-2 line-clamp-1">{note.title}</h2>
    <div class="text-base-content/70 text-sm mb-3 line-clamp-2">
      {@html note.content ? note.content.substring(0, 100) + (note.content.length > 100 ? '...' : '') : ''}
    </div>
    <div class="flex flex-wrap gap-1">
      {#each note.tags as tag}
        <span class="badge badge-sm badge-ghost">{tag}</span>
      {/each}
    </div>
  </a>
</div>