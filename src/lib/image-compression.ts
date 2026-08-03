// Client-side resize/compression before upload. Neon Object Storage (unlike the Cloudinary
// setup this replaced) does no server-side transforms, so this is the only place a phone-camera
// photo (often 4000px+, several MB) gets brought down to something reasonable before it's
// stored and served as-is forever after.
const MAX_DIMENSION = 2000;
const JPEG_WEBP_QUALITY = 0.85;

/** Resizes `file` so its longer edge is at most MAX_DIMENSION, preserving aspect ratio, and
 * re-encodes at JPEG_WEBP_QUALITY (ignored for PNG, which stays lossless). Returns the
 * original file unchanged if it's already small enough that compressing it wouldn't help,
 * or if anything about the process fails — never blocks an upload over a compression error. */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    // Already within bounds and not huge — recompressing wouldn't meaningfully shrink it.
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
      bitmap.close();
      return file;
    }

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const quality = file.type === "image/jpeg" || file.type === "image/webp" ? JPEG_WEBP_QUALITY : undefined;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, quality));
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name, { type: file.type, lastModified: Date.now() });
  } catch {
    return file;
  }
}
