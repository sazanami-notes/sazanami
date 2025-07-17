import { createAuthClient } from "better-auth/svelte"

export const authClient = createAuthClient({
    //baseURL: "http://localhost:8788"
});

export const { signIn, signUp, useSession } = authClient;