/**
 * ストレージ抽象化レイヤー
 *
 * 環境変数 STORAGE_DRIVER で切り替え:
 *   local (デフォルト) → static/uploads/ に保存
 *   s3                 → S3 互換ストレージに保存
 *
 * S3 関連環境変数:
 *   S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 *   S3_ENDPOINT     (省略可 - MinIO などのカスタムエンドポイント)
 *   S3_PUBLIC_URL   (省略可 - CDN URL など)
 */

import { env } from '$env/dynamic/private';
import fs from 'fs/promises';
import path from 'path';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface UploadResult {
	/** ブラウザからアクセスできる公開 URL */
	url: string;
	/** DB に保存するファイルパス / S3 キー */
	filePath: string;
}

export interface StorageDriver {
	upload(params: { fileId: string; fileName: string; buffer: Buffer; mimeType: string }): Promise<UploadResult>;
	delete(filePath: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Local Storage Driver
// ---------------------------------------------------------------------------

const UPLOAD_DIR = path.resolve(process.cwd(), 'static/uploads');

async function ensureUploadDir() {
	await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

const localDriver: StorageDriver = {
	async upload({ fileId, fileName, buffer }) {
		await ensureUploadDir();
		const ext = path.extname(fileName);
		const uniqueFileName = `${fileId}${ext}`;
		const filePath = path.join(UPLOAD_DIR, uniqueFileName);
		await fs.writeFile(filePath, buffer);
		const publicPath = `/uploads/${uniqueFileName}`;
		return { url: publicPath, filePath: publicPath };
	},

	async delete(filePath) {
		try {
			// filePath は "/uploads/XXXXX.png" の形式
			const absPath = path.join(process.cwd(), 'static', filePath);
			await fs.unlink(absPath);
		} catch (err: unknown) {
			// ファイルが存在しなければ無視
			if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
		}
	}
};

// ---------------------------------------------------------------------------
// S3 Storage Driver (lazy import so local mode doesn't require the SDK)
// ---------------------------------------------------------------------------

async function createS3Driver(): Promise<StorageDriver> {
	// @aws-sdk/client-s3 は npm install @aws-sdk/client-s3 が必要
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	const { S3Client, PutObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');

	const region = env.S3_REGION ?? 'us-east-1';
	const bucket = env.S3_BUCKET ?? '';
	const endpoint = env.S3_ENDPOINT || undefined;
	const publicUrlBase = env.S3_PUBLIC_URL || (endpoint ? `${endpoint}/${bucket}` : `https://${bucket}.s3.${region}.amazonaws.com`);

	const client = new S3Client({
		region,
		endpoint,
		forcePathStyle: !!endpoint, // MinIO では true が必要
		credentials: {
			accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
			secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? ''
		}
	});

	return {
		async upload({ fileId, fileName, buffer, mimeType }) {
			const ext = path.extname(fileName);
			const key = `uploads/${fileId}${ext}`;
			await client.send(
				new PutObjectCommand({
					Bucket: bucket,
					Key: key,
					Body: buffer,
					ContentType: mimeType
				})
			);
			const url = `${publicUrlBase.replace(/\/$/, '')}/${key}`;
			return { url, filePath: key };
		},

		async delete(filePath) {
			await client.send(
				new DeleteObjectCommand({
					Bucket: bucket,
					Key: filePath
				})
			);
		}
	};
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let _driver: StorageDriver | null = null;

export async function getStorageDriver(): Promise<StorageDriver> {
	if (_driver) return _driver;

	const driverName = (env.STORAGE_DRIVER ?? 'local').toLowerCase();

	if (driverName === 's3') {
		_driver = await createS3Driver();
	} else {
		_driver = localDriver;
	}

	return _driver;
}
