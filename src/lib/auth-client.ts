import { createAuthClient } from 'better-auth/svelte';
import { passkeyClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
	//baseURL: "http://localhost:8788"
    plugins: [ 
        passkeyClient() 
    ] 
});

export const { signIn, signUp, useSession, passkey, sendVerificationEmail } = authClient;

