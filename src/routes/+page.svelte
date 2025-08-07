<script lang="ts">
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';

  // ログインボタンをクリックしたときの処理
  function handleLogin() {
    goto('/login');
  }
</script>

<div class="container mx-auto px-4 py-16">
  <div class="text-center">
    <h1 class="text-4xl font-bold mb-6">{get(page).data.landing?.title || "Sazanami"}</h1>
    <p class="text-xl mb-8 text-gray-600">{get(page).data.landing?.description || "Markdownで書けるScrapbox風のメモアプリ"}</p>
    
    <div class="mb-10">
      <button 
        on:click={handleLogin}
        class="btn btn-primary btn-lg"
      >
        今すぐ始める
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
      {#each get(page).data.landing?.features || ["Markdownで書ける", "双方向リンク", "タグ管理", "SNSライクなメモ機能"] as feature}
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body items-center text-center">
            <h2 class="card-title text-primary">{feature}</h2>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
