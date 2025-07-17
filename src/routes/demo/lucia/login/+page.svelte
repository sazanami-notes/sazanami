<script lang="ts">
import { signIn, signUp } from "$lib/auth-client";
import { writable } from "svelte/store";

const email = writable("");
const password = writable("");
const error = writable("");

const handleSignIn = async () => {
  error.set(""); // エラーメッセージをクリア
  try {
    await signIn.email(
      {
        email: $email,
        password: $password,
        callbackURL: "/",
      },
      {
        onError(context) {
          error.set(context.error.message);
        },
      }
    );
  } catch (e) {
    error.set("予期しないエラーが発生しました");
  }
};

const handleSignUp = async () => {
  error.set(""); // エラーメッセージをクリア
  try {
    await signUp.email(
      {
        email: $email,
        // 新規登録時には名前が必要ですが、UIにフィールドがないため一時的に空文字列を設定します。
        // 必要に応じてUIに名前入力フィールドを追加し、この値を設定してください。
        name: "",
        password: $password,
        callbackURL: "/",
      },
      {
        onError(context) {
          error.set(context.error.message);
        },
      }
    );
  } catch (e) {
    error.set("予期しないエラーが発生しました");
  }
};
</script>

<div class="card w-full max-w-sm shadow-xl mx-auto">
  <div class="card-body">
    <h2 class="card-title text-2xl">アカウント</h2>
    <p>メールアドレスとパスワードを入力してください</p>
    
    <div class="form-control w-full mt-4">
      <label class="label" for="email">
        <span class="label-text">メールアドレス</span>
      </label>
      <input
        id="email"
        type="email"
        placeholder="m@example.com"
        class="input input-bordered w-full"
        required
        bind:value={$email}
      />
    </div>
    <div class="form-control w-full mt-2">
      <label class="label" for="password">
        <span class="label-text">パスワード</span>
        <a href="/forget-password" class="label-text-alt link link-hover">
          パスワードを忘れましたか？
        </a>
      </label>
      <input
        id="password"
        type="password"
        class="input input-bordered w-full"
        required
        bind:value={$password}
      />
    </div>
    
    {#if $error}
      <div class="text-error text-sm mt-4">{$error}</div>
    {/if}
    
    <div class="card-actions justify-end mt-6">
      <button type="button" class="btn btn-primary w-full" on:click={handleSignIn}>
        ログイン
      </button>
      <button type="button" class="btn btn-secondary w-full" on:click={handleSignUp}>
        新規登録
      </button>
      <button
        type="button"
        class="btn btn-outline w-full"
        on:click={async () => {
          await signIn.social({
            provider: "google",
            callbackURL: "/",
          });
        }}>
        Googleでログイン
      </button>
    </div>
  </div>
</div>
