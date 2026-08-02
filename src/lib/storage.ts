import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { MAX_PHOTOS, MIN_PHOTOS } from "@/lib/constants";

export { MIN_PHOTOS, MAX_PHOTOS };

// S3-compatible object storage for every image in the app — listing photos, dealer
// logos/covers, avatars (all public), and verification documents (private, VER-04).
// Backed by Neon Object Storage (public_read bucket, name set via STORAGE_BUCKET), reached via the
// standard AWS SDK env vars — works unmodified with Cloudflare R2 or AWS S3 too, since
// all three speak the same S3 API.
const AWS_ENDPOINT_URL_S3 = process.env.AWS_ENDPOINT_URL_S3;
const AWS_REGION = process.env.AWS_REGION || "auto";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const BUCKET = process.env.STORAGE_BUCKET;
// Public objects are served directly off the S3 endpoint (path-style, e.g.
// https://<endpoint>/<bucket>/<key>) — that's how public_read buckets serve anonymous
// GETs. Override with STORAGE_PUBLIC_URL_BASE if a CDN/custom domain sits in front instead.
const PUBLIC_URL_BASE =
  process.env.STORAGE_PUBLIC_URL_BASE || (AWS_ENDPOINT_URL_S3 && BUCKET ? `${AWS_ENDPOINT_URL_S3}/${BUCKET}` : undefined);
// Dedicated bucket for verification documents (identity/ownership docs, VER-04 — never
// served publicly). Must be a genuinely private bucket, not the public STORAGE_BUCKET — see
// uploadVerificationDoc below; there is no same-bucket fallback because a public_read
// bucket can't make a prefix private, it would just be an unlisted-but-fetchable URL.
const PRIVATE_BUCKET = process.env.STORAGE_PRIVATE_BUCKET;

// Credentials incomplete — save everything to disk so local development and testing
// works before real Neon Object Storage credentials are set up.
const useLocalFallback = !BUCKET || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY;
const usePrivateLocalFallback = !PRIVATE_BUCKET || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY;

const client =
  useLocalFallback && usePrivateLocalFallback
    ? null
    : new S3Client({
        region: AWS_REGION,
        endpoint: AWS_ENDPOINT_URL_S3 || undefined,
        // Neon Object Storage's TLS cert only covers one subdomain level
        // (*.storage.<region>.aws.neon.tech), so the SDK's default virtual-hosted-style
        // addressing (<bucket>.<endpoint>) fails certificate validation. Path-style
        // (<endpoint>/<bucket>) is what Neon (and R2) actually serve.
        forcePathStyle: true,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID!,
          secretAccessKey: AWS_SECRET_ACCESS_KEY!,
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

/** Uploads a public image (listing photo, dealer asset, or avatar) under `key` and
 * returns its public URL — the single place all three public upload functions below
 * share their local-fallback/S3 logic. */
async function uploadPublicImage(file: File, key: string): Promise<string> {
  const body = new Uint8Array(await file.arrayBuffer());

  if (useLocalFallback) {
    const filePath = path.join(process.cwd(), "public", "uploads", key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, body);
    return `/uploads/${key}`;
  }

  await client!.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: file.type,
    }),
  );

  return `${PUBLIC_URL_BASE!.replace(/\/$/, "")}/${key}`;
}

/** Uploads one listing photo and returns its public URL (stored as listingPhotos.storageKey). */
export async function uploadListingPhoto(file: File, listingId: string): Promise<string> {
  const ext = EXT_BY_TYPE[file.type];
  return uploadPublicImage(file, `listings/${listingId}/${randomUUID()}.${ext}`);
}

/** Uploads a dealer logo/cover image and returns its public URL. Mirrors
 * uploadListingPhoto exactly — same bucket, just a different key prefix. */
export async function uploadDealerAsset(
  file: File,
  dealerId: string,
  kind: "logo" | "cover",
): Promise<string> {
  const ext = EXT_BY_TYPE[file.type];
  return uploadPublicImage(file, `dealers/${dealerId}/${kind}-${randomUUID()}.${ext}`);
}

/** Uploads a user's profile avatar and returns its public URL. Mirrors
 * uploadListingPhoto/uploadDealerAsset exactly — same bucket, own key prefix. */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const ext = EXT_BY_TYPE[file.type];
  return uploadPublicImage(file, `avatars/${userId}/${randomUUID()}.${ext}`);
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
