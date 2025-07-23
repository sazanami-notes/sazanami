<h1 class="text-bold m-4 pt-10 text-3xl">Sazanami</h1>

<a href="/milkdown" class="btn m-4 w-30">milkdown</a>

{#if $session.data}
  <button class="btn btn-outline m-4" on:click={async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          goto('/login');
        }
      }
    });
  }}>
    Logout
  </button>
{/if}

<script lang="ts">
import { authClient } from '$lib/auth-client';
import { goto } from '$app/navigation';
const session = authClient.useSession();
</script>

