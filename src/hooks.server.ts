// src/hooks.server.ts

import { auth } from "$lib/server/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
 
export async function handle({ event, resolve }) {
  // ライブラリ提供のハンドラに戻す
  return svelteKitHandler({ event, resolve, auth, building });
}