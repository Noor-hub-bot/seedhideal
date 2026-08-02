import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v2 as cloudinary, type UploadApiOptions } from "cloudinary";
import { MAX_PHOTOS, MIN_PHOTOS } from "@/lib/constants";

export { MIN_PHOTOS, MAX_PHOTOS };

// ---------- Public images (listing photos, dealer logos/covers, avatars) — Cloudinary ----------

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

const useCloudinary = !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

if (useCloudinary) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/** Uploads bytes to Cloudinary and returns the delivery URL. Every upload carries the
 * same transformation, baked directly into the stored/returned URL: capped at 2000px
 * (listing photos can arrive up to 6MB straight off a phone camera), quality:auto:good
 * (perceptual compression), fetch_format:auto (serves WebP/AVIF to browsers that
 * support it, JPEG otherwise) — callers and <Image> consumers never need to know any
 * of this happened, they just get back a URL that's already optimized. */
function uploadToCloudinary(bytes: Uint8Array, options: UploadApiOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        overwrite: false,
        transformation: [{ width: 2000, crop: "limit" }, { quality: "auto:good" }, { fetch_format: "auto" }],
        ...options,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary upload returned no result."));
        resolve(result.secure_url);
      },
    );
    uploadStream.end(Buffer.from(bytes));
  });
}

// No CLOUDINARY_* configured yet — save to disk so local development works before a
// real Cloudinary account is set up.
const publicLocalFallback = !useCloudinary;

// ---------- Private documents (verification identity/ownership proof) — S3/R2 ----------
// Unrelated to the Cloudinary path above: these must never be served publicly (VER-04),
// so they stay on signed, authenticated access through /api/verification-docs rather
// than Cloudinary's public delivery URLs.

// Works with both Cloudflare R2 and AWS S3 — both speak the same S3 API.
// R2: set STORAGE_ENDPOINT to https://<account-id>.r2.cloudflarestorage.com and STORAGE_REGION to "auto".
// AWS S3: leave STORAGE_ENDPOINT unset and set STORAGE_REGION to the bucket's region (e.g. "ap-south-1").
const BUCKET = process.env.STORAGE_BUCKET;
// Optional dedicated bucket for verification documents. Falls back to a private-prefixed
// key in the main bucket.
const PRIVATE_BUCKET = process.env.STORAGE_PRIVATE_BUCKET || BUCKET;

// No STORAGE_BUCKET configured yet — save documents to disk so local development
// and testing works before a real R2/S3 bucket is set up.
const usePrivateLocalFallback = !PRIVATE_BUCKET;

const client = usePrivateLocalFallback
  ? null
  : new S3Client({
      region: process.env.STORAGE_REGION || "auto",
      endpoint: process.env.STORAGE_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
      },
    });

export const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

export const ALLOWED_DOC_TYPES = new Set([...ALLOWED_PHOTO_TYPES, "application/pdf"]);
export const MAX_DOC_BYTES = 8 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const TYPE_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(EXT_BY_TYPE).map(([type, ext]) => [ext, type]),
);

function bytesStartWith(bytes: Uint8Array, sig: number[], offset = 0): boolean {
  if (bytes.length < offset + sig.length) return false;
  return sig.every((b, i) => bytes[offset + i] === b);
}

/**
 * Sniffs the real file type from its magic-number signature — the client-supplied MIME type
 * (`file.type`) is attacker-controlled and must never be trusted on its own.
 */
export function detectFileType(bytes: Uint8Array): string | null {
  if (bytesStartWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (
    bytesStartWith(bytes, [0x52, 0x49, 0x46, 0x46]) && // "RIFF"
    bytesStartWith(bytes, [0x57, 0x45, 0x42, 0x50], 8) // "WEBP"
  )
    return "image/webp";
  if (bytesStartWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // "%PDF-"
  return null;
}

async function uploadPublicImage(file: File, localKey: string, cloudinaryOptions: UploadApiOptions): Promise<string> {
  const body = new Uint8Array(await file.arrayBuffer());

  if (publicLocalFallback) {
    const filePath = path.join(process.cwd(), "public", "uploads", localKey);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, body);
    return `/uploads/${localKey}`;
  }

  return uploadToCloudinary(body, cloudinaryOptions);
}

/** Uploads one listing photo to Cloudinary and returns its delivery URL — stored
 * verbatim as listingPhotos.storageKey and rendered directly via next/image. */
export async function uploadListingPhoto(file: File, listingId: string): Promise<string> {
  const ext = EXT_BY_TYPE[file.type];
  return uploadPublicImage(file, `listings/${listingId}/${randomUUID()}.${ext}`, {
    folder: `seedhideal/listings/${listingId}`,
    public_id: randomUUID(),
  });
}

/** Uploads a dealer logo/cover image to Cloudinary and returns its delivery URL. Mirrors
 * uploadListingPhoto exactly — same account, just a different folder prefix. */
export async function uploadDealerAsset(
  file: File,
  dealerId: string,
  kind: "logo" | "cover",
): Promise<string> {
  const ext = EXT_BY_TYPE[file.type];
  return uploadPublicImage(file, `dealers/${dealerId}/${kind}-${randomUUID()}.${ext}`, {
    folder: `seedhideal/dealers/${dealerId}`,
    public_id: `${kind}-${randomUUID()}`,
  });
}

/** Uploads a user's profile avatar to Cloudinary and returns its delivery URL. Mirrors
 * uploadListingPhoto/uploadDealerAsset exactly — same account, own folder prefix. */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const ext = EXT_BY_TYPE[file.type];
  return uploadPublicImage(file, `avatars/${userId}/${randomUUID()}.${ext}`, {
    folder: `seedhideal/avatars/${userId}`,
    public_id: randomUUID(),
  });
}

function privateLocalPath(key: string): string {
  return path.join(process.cwd(), "private-uploads", key);
}

/**
 * Uploads a verification document (identity/ownership proof) and returns its storage key —
 * never a public URL. Bytes are only ever served back through the authenticated
 * /api/verification-docs route.
 */
export async function uploadVerificationDoc(
  file: File,
  userId: string,
  kind: "identity" | "ownership",
): Promise<string> {
  const ext = EXT_BY_TYPE[file.type];
  const key = `verification/${userId}/${kind}-${randomUUID()}.${ext}`;
  const body = new Uint8Array(await file.arrayBuffer());

  if (usePrivateLocalFallback) {
    const filePath = privateLocalPath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, body);
    return key;
  }

  await client!.send(
    new PutObjectCommand({
      Bucket: PRIVATE_BUCKET,
      Key: `private-verification/${key}`,
      Body: body,
      ContentType: file.type,
    }),
  );

  return `private-verification/${key}`;
}

/** Reads back a verification document's bytes for the authenticated doc-viewer route. */
export async function getVerificationDocBytes(
  storageKey: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const ext = storageKey.split(".").pop() ?? "";
  const contentType = TYPE_BY_EXT[ext] ?? "application/octet-stream";

  if (usePrivateLocalFallback) {
    const bytes = await readFile(privateLocalPath(storageKey));
    return { bytes: new Uint8Array(bytes), contentType };
  }

  const res = await client!.send(
    new GetObjectCommand({ Bucket: PRIVATE_BUCKET, Key: storageKey }),
  );
  const bytes = await res.Body!.transformToByteArray();
  return { bytes, contentType: res.ContentType ?? contentType };
}
