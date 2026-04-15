import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { attachments } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';
import { getStorageDriver } from '$lib/server/storage';
import { ulid } from 'ulid';
import { eq, and, desc } from 'drizzle-orm';

// 許可する MIME タイプ
const ALLOWED_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/svg+xml',
	'image/avif'
];

// 最大ファイルサイズ (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// --------------------------------------------------------
// GET /api/attachments - ユーザーの画像一覧
// --------------------------------------------------------
export const GET: RequestHandler = async ({ request, url }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 100);
	const offset = Number(url.searchParams.get('offset') ?? '0');

	const rows = await db
		.select()
		.from(attachments)
		.where(eq(attachments.userId, session.user.id))
		.orderBy(desc(attachments.createdAt))
		.limit(limit)
		.offset(offset);

	return json(rows);
};

// --------------------------------------------------------
// POST /api/attachments - ファイルアップロード
// --------------------------------------------------------
export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;

		if (!file) {
			return json({ message: 'No file uploaded' }, { status: 400 });
		}

		if (!ALLOWED_MIME_TYPES.includes(file.type)) {
			return json({ message: 'File type not allowed' }, { status: 415 });
		}

		if (file.size > MAX_FILE_SIZE) {
			return json({ message: 'File too large (max 10MB)' }, { status: 413 });
		}

		const fileId = ulid();
		const buffer = Buffer.from(await file.arrayBuffer());

		const storage = await getStorageDriver();
		const { url, filePath } = await storage.upload({
			fileId,
			fileName: file.name,
			buffer,
			mimeType: file.type
		});

		const newAttachment = {
			id: fileId,
			userId: session.user.id,
			fileName: file.name,
			filePath,
			mimeType: file.type,
			fileSize: file.size,
			createdAt: new Date()
		};

		await db.insert(attachments).values(newAttachment);

		return json({ success: true, url, id: fileId, fileName: file.name }, { status: 201 });
	} catch (error) {
		console.error('Error handling file upload:', error);
		return json({ message: 'Internal Server Error' }, { status: 500 });
	}
};

// --------------------------------------------------------
// DELETE /api/attachments?id=XXX - 画像削除
// --------------------------------------------------------
export const DELETE: RequestHandler = async ({ request, url }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const id = url.searchParams.get('id');
	if (!id) {
		return json({ message: 'id is required' }, { status: 400 });
	}

	// 自分のファイルか確認
	const rows = await db
		.select()
		.from(attachments)
		.where(and(eq(attachments.id, id), eq(attachments.userId, session.user.id)))
		.limit(1);

	if (rows.length === 0) {
		return json({ message: 'Not found' }, { status: 404 });
	}

	const attachment = rows[0];

	try {
		const storage = await getStorageDriver();
		await storage.delete(attachment.filePath);
	} catch (err) {
		console.error('Storage delete error:', err);
		// ストレージ削除失敗でもDBは削除する（孤立ファイルより孤立DBレコードの方がマシ）
	}

	await db
		.delete(attachments)
		.where(and(eq(attachments.id, id), eq(attachments.userId, session.user.id)));

	return json({ success: true });
};
