import { createAuthClient } from 'better-auth/svelte';
import { passkeyClient, magicLinkClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
	//baseURL: "http://localhost:8788"
    plugins: [ 
        passkeyClient(),
        magicLinkClient()
    ] 
});

export const {
    signIn,
    signUp,
    useSession,
    passkey,
    sendVerificationEmail,
    updateUser,
    linkSocial,
    listAccounts,
    unlinkAccount
} = authClient;
