/**
 * アップロード前のAVIF変換（ブラウザ側でWASMエンコード）
 *
 * 方針:
 * - JPEG / PNG / WebP のみAVIFへ変換（GIFはアニメーションが消えるので対象外、SVGも対象外）
 * - 変換失敗時は元のファイルをそのまま使う（アップロードは止めない）
 * - 大きい画像は長辺 MAX_DIMENSION に縮小
 */

const CONVERTIBLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_DIMENSION = 2560;
const MIN_SIZE_BYTES = 20 * 1024; // 小さい画像はAVIFにすると逆に重いことがある
export const AVIF_QUALITY = 62;
const AVIF_SPEED = 6; // 0(遅い/高圧縮)〜10(速い)

export function canConvertToAvif(file: File): boolean {
	return CONVERTIBLE_TYPES.has(file.type) && file.size >= MIN_SIZE_BYTES;
}

/** ファイル名の拡張子を差し替える */
function withExtension(name: string, ext: string): string {
	const base = name.replace(/\.[^./\\]+$/, '');
	return `${base}.${ext}`;
}

/**
 * 画像をAVIFに変換する。変換できない場合は null を返す（呼び出し側でフォールバック）。
 */
export async function convertToAvif(file: File): Promise<File | null> {
	if (!canConvertToAvif(file)) return null;

	try {
		const bitmap = await createImageBitmap(file);
		const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
		const width = Math.max(1, Math.round(bitmap.width * scale));
		const height = Math.max(1, Math.round(bitmap.height * scale));

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d', { alpha: true });
		if (!ctx) return null;
		ctx.drawImage(bitmap, 0, 0, width, height);
		bitmap.close?.();

		const imageData = ctx.getImageData(0, 0, width, height);

		// WASMエンコーダは必要になった時だけ読み込む（初回のみ数MB）
		const { default: encode } = await import('@jsquash/avif/encode');
		const buffer = await encode(imageData, { quality: AVIF_QUALITY, speed: AVIF_SPEED });

		// 変換結果の方が大きい場合は元を優先
		if (buffer.byteLength >= file.size) return null;

		return new File([buffer], withExtension(file.name, 'avif'), {
			type: 'image/avif',
			lastModified: file.lastModified
		});
	} catch (err) {
		console.warn('AVIF conversion failed, falling back to original:', err);
		return null;
	}
}

/** 変換できればAVIF、できなければ元ファイルを返す */
export async function toAvifOrOriginal(file: File): Promise<File> {
	const converted = await convertToAvif(file);
	return converted ?? file;
}
