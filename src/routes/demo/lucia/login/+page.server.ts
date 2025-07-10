import scryptJs from 'scrypt-js';
const scrypt = scryptJs.scrypt;

import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth';
import * as table from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

// バイト配列を16進数文字列に変換する関数
function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

// 16進数文字列をバイト配列に変換する関数
function hexToBytes(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
	}
	return bytes;
}

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/demo/lucia');
	}
	return {};
};

export const actions: Actions = {
	login: async (event) => {
		if (!event.locals.db) {
			return fail(500, { message: 'Database not available' });
		}

		const formData = await event.request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		if (!validateUsername(username)) {
			return fail(400, {
				message: 'Invalid username (min 3, max 31 characters, alphanumeric only)'
			});
		}
		if (!validatePassword(password)) {
			return fail(400, { message: 'Invalid password (min 6, max 255 characters)' });
		}

		const results = await event.locals.db.select().from(table.user).where(eq(table.user.username, username));

		const existingUser = results.at(0);
		if (!existingUser) {
			return fail(400, { message: 'Incorrect username or password' });
		}

		const [saltHex, storedHashHex] = existingUser.passwordHash.split(':');
		if (!saltHex || !storedHashHex) {
			// 保存されているハッシュの形式が不正な場合
			return fail(500, { message: 'Stored password hash is invalid' });
		}
		const salt = hexToBytes(saltHex);
		const passwordBytes = new TextEncoder().encode(password);

		// 入力されたパスワードとDBのソルトでハッシュを再計算
		const hashToVerifyBytes = await scrypt(passwordBytes, salt, 16384, 8, 1, 32);

		// 計算したハッシュが、DBに保存されていたものと一致するか比較
		const validPassword = bytesToHex(new Uint8Array(hashToVerifyBytes)) === storedHashHex;

		if (!validPassword) {
			return fail(400, { message: 'Incorrect username or password' });
		}

		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(sessionToken, existingUser.id, event.locals.db);
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

		return redirect(302, '/demo/lucia');
	},
	register: async (event) => {
		if (!event.locals.db) {
			return fail(500, { message: 'Database not available' });
		}

		const formData = await event.request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		if (!validateUsername(username)) {
			return fail(400, { message: 'Invalid username' });
		}
		if (!validatePassword(password)) {
			return fail(400, { message: 'Invalid password' });
		}

		const userId = crypto.randomUUID();
		const salt = crypto.getRandomValues(new Uint8Array(16));
		const passwordBytes = new TextEncoder().encode(password);

		const hashBytes = await scrypt(passwordBytes, salt, 16384, 8, 1, 32);

		// ソルトとハッシュ値を結合して、一つの文字列としてDBに保存
		const passwordHash = `${bytesToHex(salt)}:${bytesToHex(new Uint8Array(hashBytes))}`;

		try {
			await event.locals.db.insert(table.user).values({ id: userId, username, passwordHash });

			const sessionToken = auth.generateSessionToken();
			const session = await auth.createSession(sessionToken, userId, event.locals.db);
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
		} catch {
			return fail(500, { message: 'An error has occurred' });
		}
		return redirect(302, '/demo/lucia');
	}
};

function generateUserId() {
	return crypto.randomUUID();
}

function validateUsername(username: unknown): username is string {
	return (
		typeof username === 'string' &&
		username.length >= 3 &&
		username.length <= 31 &&
		/^[a-z0-9_-]+$/.test(username)
	);
}

function validatePassword(password: unknown): password is string {
	return typeof password === 'string' && password.length >= 6 && password.length <= 255;
}
