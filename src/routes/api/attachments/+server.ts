import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { attachments } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';
import { ulid } from 'ulid';
import fs from 'fs/promises';
import path from 'path';

// The directory where uploads will be stored
const UPLOAD_DIR = path.resolve(process.cwd(), 'static/uploads');

// Ensure the upload directory exists
const ensureUploadDir = async () => {
	try {
		await fs.mkdir(UPLOAD_DIR, { recursive: true });
	} catch (error) {
		console.error('Error creating upload directory:', error);
		throw new Error('Could not create upload directory');
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	try {
		await ensureUploadDir();

		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return json({ message: 'No file uploaded' }, { status: 400 });
		}

		// Generate a unique filename to prevent collisions
		const uniqueId = ulid();
		const fileExtension = path.extname(file.name);
		const uniqueFileName = `${uniqueId}${fileExtension}`;
		const filePath = path.join(UPLOAD_DIR, uniqueFileName);

		// Save the file to the filesystem
		const buffer = await file.arrayBuffer();
		await fs.writeFile(filePath, Buffer.from(buffer));

		// Save metadata to the database
		const newAttachment = {
			id: uniqueId,
			userId: session.user.id,
			fileName: file.name,
			filePath: `/uploads/${uniqueFileName}`, // Store the public URL path
			mimeType: file.type,
			fileSize: file.size,
			createdAt: new Date()
		};

		await db.insert(attachments).values(newAttachment);

		return json(
			{
				success: true,
				url: newAttachment.filePath
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error handling file upload:', error);
		return json({ message: 'Internal Server Error' }, { status: 500 });
	}
};
