import { createAuthClient } from 'better-auth/svelte';
import { passkeyClient, magicLinkClient, twoFactorClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
	//baseURL: "http://localhost:8788"
    plugins: [ 
        passkeyClient(),
        magicLinkClient(),
        twoFactorClient()
    ] 
});

export const {
    signIn,
    signUp,
    useSession,
    passkey,
    twoFactor,
    sendVerificationEmail,
    updateUser,
    linkSocial,
    listAccounts,
    unlinkAccount
} = authClient;
