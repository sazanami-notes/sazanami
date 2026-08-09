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
	unlinkAccount
} = authClient;

type EmailPasswordClient = {
	forgetPassword: (params: {
		email: string;
		redirectTo?: string;
	}) => Promise<{ error: { message?: string } | null }>;
	resetPassword: (params: {
		newPassword: string;
		token: string;
		revokeOtherSessions?: boolean;
	}) => Promise<{ error: { message?: string } | null }>;
};

// better-authの型定義にemailPasswordプロパティが含まれないため、
// 明示的な型で公開する（実行時はauthClient.emailPasswordを参照）
export const emailPassword: EmailPasswordClient = (
	authClient as unknown as { emailPassword: EmailPasswordClient }
).emailPassword;
