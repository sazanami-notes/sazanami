/**
 * ストレージ抽象化レイヤー
 *
 * 環境変数 STORAGE_DRIVER で切り替え:
 *   local (デフォルト) → static/uploads/ に保存 (開発用)
 *   s3                 → S3 互換ストレージに保存
 *   r2                 → Cloudflare R2 (本番用)
 *
 * S3 / R2 関連環境変数:
 *   S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 *   S3_ENDPOINT     (省略可 - MinIO などのカスタムエンドポイント)
 *   S3_PUBLIC_URL   (省略可 - CDN URL など)
 */
import { env } from '$env/dynamic/private';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface UploadResult {
	/** ブラウザからアクセスできる公開 URL */
	url: string;
	/** DB に保存するファイルパス / ストレージキー */
	filePath: string;
}

export interface StorageDriver {
	upload(params: { fileId: string; fileName: string; buffer: Buffer; mimeType: string }): Promise<UploadResult>;
	delete(filePath: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractExt(fileName: string): string {
	const dotIndex = fileName.lastIndexOf('.');
	return dotIndex >= 0 ? fileName.slice(dotIndex) : '';
}

// ---------------------------------------------------------------------------
// Local Storage Driver (開発用 - fs, path は動的インポート)
// Cloudflare Workers では fs が利用不可のため、ビルド時エラーを避けるため遅延ロード
// ---------------------------------------------------------------------------

async function createLocalDriver(): Promise<StorageDriver> {
	// 開発時のみ fs/promises と path を動的インポート
	const [{ default: fs }, { default: path }] = await Promise.all([
		import('node:fs/promises'),
		import('node:path')
	]);

	const UPLOAD_DIR = path.resolve('static/uploads');

	async function ensureUploadDir() {
		await fs.mkdir(UPLOAD_DIR, { recursive: true });
	}

	return {
		async upload({ fileId, fileName, buffer }) {
			await ensureUploadDir();
			const ext = extractExt(fileName);
			const uniqueFileName = `${fileId}${ext}`;
			const filePath = path.join(UPLOAD_DIR, uniqueFileName);
			await fs.writeFile(filePath, buffer);
			const publicPath = `/uploads/${uniqueFileName}`;
			return { url: publicPath, filePath: publicPath };
		},
		async delete(filePath) {
			try {
				// filePath は "/uploads/XXXXX.png" の形式
				const absPath = path.join('static', filePath);
				await fs.unlink(absPath);
			} catch (err: unknown) {
				// ファイルが存在しなければ無視
				if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
			}
		}
	};
}

// ---------------------------------------------------------------------------
// S3 Storage Driver (lazy import so local mode doesn't require the SDK)
// ---------------------------------------------------------------------------

async function createS3Driver(): Promise<StorageDriver> {
	// @aws-sdk/client-s3 は bun add @aws-sdk/client-s3 が必要
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
			const ext = extractExt(fileName);
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
// Cloudflare R2 Storage Driver (本番用)
// ---------------------------------------------------------------------------

// Minimal R2Bucket interface (full types from @cloudflare/workers-types)
interface R2Bucket {
	put(key: string, value: ArrayBuffer | Uint8Array | ReadableStream | string, options?: {
		httpMetadata?: { contentType?: string };
		customMetadata?: Record<string, string>;
	}): Promise<R2Object | null>;
	delete(key: string | string[]): Promise<void>;
}

interface R2Object {
	key: string;
	version: string;
	size: number;
	etag: string;
	httpEtag: string;
	uploaded: Date;
	httpMetadata?: Record<string, string>;
}

interface R2Config {
	bucket: R2Bucket;
	publicUrl?: string;
}

class R2Driver implements StorageDriver {
	constructor(private config: R2Config) {}

	async upload({ fileId, fileName, buffer, mimeType }: {
		fileId: string; fileName: string; buffer: Buffer; mimeType: string
	}): Promise<UploadResult> {
		const ext = extractExt(fileName);
		const key = `uploads/${fileId}${ext}`;

		await this.config.bucket.put(key, buffer, {
			httpMetadata: { contentType: mimeType }
		});

		const publicUrl = this.config.publicUrl
			? `${this.config.publicUrl.replace(/\/$/, '')}/${key}`
			: `/${key}`;

		return { url: publicUrl, filePath: key };
	}

	async delete(filePath: string): Promise<void> {
		await this.config.bucket.delete(filePath);
	}
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let driverPromise: Promise<StorageDriver> | null = null;

/**
 * Get the configured storage driver.
 * - 'local': file system (for local dev)
 * - 's3': S3-compatible storage
 * - 'r2': Cloudflare R2 (for production)
 *
 * @param r2Bucket R2 bucket binding (required when STORAGE_DRIVER=r2)
 */
export async function getStorageDriver(r2Bucket?: R2Bucket): Promise<StorageDriver> {
	if (driverPromise) return driverPromise;

	const driverName = (env.STORAGE_DRIVER ?? 'local').toLowerCase();

	if (driverName === 'r2' && r2Bucket) {
		driverPromise = Promise.resolve(new R2Driver({
			bucket: r2Bucket,
			publicUrl: env.S3_PUBLIC_URL
		}));
	} else if (driverName === 's3') {
		driverPromise = createS3Driver();
	} else {
		driverPromise = createLocalDriver();
	}

	return driverPromise;
}

/** Check if STORAGE_DRIVER is set to 'r2' */
export function isR2Configured(): boolean {
	return (env.STORAGE_DRIVER ?? 'local').toLowerCase() === 'r2';
}
