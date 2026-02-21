import { createAuthClient } from 'better-auth/svelte';
import { magicLinkClient, twoFactorClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';

export const authClient = createAuthClient({
	//baseURL: "http://localhost:8788"
	plugins: [passkeyClient(), magicLinkClient(), twoFactorClient()]
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
	unlinkAccount,
	forgetPassword,
	resetPassword,
	changePassword
} = authClient;
