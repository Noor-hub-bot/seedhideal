"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  deleteListingPhotoAction,
  reorderListingPhotosAction,
  setCoverPhotoAction,
} from "@/lib/actions/marketplace";
import { compressImage } from "@/lib/image-compression";
import { PhotoLightbox } from "@/components/photo-lightbox";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

export type ExistingPhoto = { id: string; storageKey: string };

type PendingItem = { key: string; file: File; url: string };

/** Drag-and-drop, cover selection, individual delete, add-more, validation, client-side
 * compression, and a fullscreen lightbox preview — for both the create-listing photo
 * picker (mode="create", everything local until the whole form submits) and the edit-page
 * photo manager (mode="edit", every action here is live against the server the instant it
 * happens, independent of the rest of the form). */
export function PhotoManager({
  mode,
  listingId,
  initialPhotos = [],
  minPhotos,
  maxPhotos,
}: {
  mode: "create" | "edit";
  listingId?: string;
  initialPhotos?: ExistingPhoto[];
  minPhotos: number;
  maxPhotos: number;
}) {
  const [existing, setExisting] = useState<ExistingPhoto[]>(initialPhotos);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [uploading, setUploading] = useState<{ name: string; progress: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitFileInputRef = useRef<HTMLInputElement>(null);

  const totalCount = mode === "create" ? pending.length : existing.length;
  const photoUrls = mode === "create" ? pending.map((p) => p.url) : existing.map((p) => p.storageKey);

  function syncSubmitInput(files: File[]) {
    if (!submitFileInputRef.current) return;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    submitFileInputRef.current.files = dt.files;
  }

  async function validateAndPrepare(files: File[]): Promise<File[]> {
    const problems: string[] = [];
    const ok: File[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        problems.push(`${file.name}: only JPG, PNG or WEBP images are allowed.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        problems.push(`${file.name}: must be under 10MB.`);
        continue;
      }
      ok.push(await compressImage(file));
    }
    if (problems.length > 0) setError(problems.join(" "));
    else setError(null);
    return ok;
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const room = maxPhotos - totalCount;
    if (room <= 0) {
      setError(`You already have the maximum of ${maxPhotos} photos.`);
      return;
    }
    const chosen = Array.from(fileList).slice(0, room);
    if (fileList.length > room) {
      setError(`Only ${room} more photo${room === 1 ? "" : "s"} can be added (max ${maxPhotos} total).`);
    }
    const files = await validateAndPrepare(chosen);
    if (files.length === 0) return;

    if (mode === "create") {
      setPending((prev) => {
        const next = [...prev, ...files.map((f) => ({ key: crypto.randomUUID(), file: f, url: URL.createObjectURL(f) }))];
        syncSubmitInput(next.map((p) => p.file));
        return next;
      });
      return;
    }

    // Edit mode: upload immediately with real progress via XHR (fetch has no upload
    // progress API), then merge the server's returned rows straight into `existing`.
    setUploading(files.map((f) => ({ name: f.name, progress: 0 })));
    try {
      const result = await uploadWithProgress(listingId!, files, (i, pct) => {
        setUploading((prev) => prev.map((u, idx) => (idx === i ? { ...u, progress: pct } : u)));
      });
      if (result.error) {
        setError(result.error);
      } else if (result.photos) {
        setExisting((prev) => [...prev, ...result.photos!]);
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading([]);
    }
  }

  async function handleReorder(newOrderKeys: string[]) {
    if (mode === "create") {
      setPending((prev) => {
        const byKey = new Map(prev.map((p) => [p.key, p]));
        const next = newOrderKeys.map((k) => byKey.get(k)!).filter(Boolean);
        syncSubmitInput(next.map((p) => p.file));
        return next;
      });
      return;
    }
    const previous = existing;
    const byId = new Map(existing.map((p) => [p.id, p]));
    const next = newOrderKeys.map((k) => byId.get(k)!).filter(Boolean);
    setExisting(next);
    const result = await reorderListingPhotosAction(listingId!, newOrderKeys);
    if (result.error) {
      setExisting(previous);
      setError(result.error);
    }
  }

  function onDragStart(key: string) {
    setDragKey(key);
  }
  function onDragOverItem(e: React.DragEvent, overKey: string) {
    e.preventDefault();
    if (!dragKey || dragKey === overKey) return;
    const keys = mode === "create" ? pending.map((p) => p.key) : existing.map((p) => p.id);
    const from = keys.indexOf(dragKey);
    const to = keys.indexOf(overKey);
    if (from === -1 || to === -1) return;
    const next = [...keys];
    next.splice(from, 1);
    next.splice(to, 0, dragKey);
    handleReorder(next);
  }
  function onDragEnd() {
    setDragKey(null);
  }

  async function handleSetCover(key: string) {
    if (mode === "create") {
      setPending((prev) => {
        const target = prev.find((p) => p.key === key);
        if (!target) return prev;
        const next = [target, ...prev.filter((p) => p.key !== key)];
        syncSubmitInput(next.map((p) => p.file));
        return next;
      });
      return;
    }
    setBusyKey(key);
    const previous = existing;
    const target = existing.find((p) => p.id === key);
    if (target) setExisting([target, ...existing.filter((p) => p.id !== key)]);
    const result = await setCoverPhotoAction(listingId!, key);
    if (result.error) {
      setExisting(previous);
      setError(result.error);
    }
    setBusyKey(null);
  }

  async function handleDelete(key: string) {
    if (!confirm("Delete this photo? This can't be undone.")) return;

    if (mode === "create") {
      setPending((prev) => {
        const removed = prev.find((p) => p.key === key);
        if (removed) URL.revokeObjectURL(removed.url);
        const next = prev.filter((p) => p.key !== key);
        syncSubmitInput(next.map((p) => p.file));
        return next;
      });
      return;
    }
    if (existing.length <= minPhotos) {
      setError(`A listing needs at least ${minPhotos} photos — add one before removing another.`);
      return;
    }
    setBusyKey(key);
    const previous = existing;
    setExisting(existing.filter((p) => p.id !== key));
    const result = await deleteListingPhotoAction(listingId!, key);
    if (result.error) {
      setExisting(previous);
      setError(result.error);
    }
    setBusyKey(null);
  }

  const items =
    mode === "create"
      ? pending.map((p) => ({ key: p.key, url: p.url }))
      : existing.map((p) => ({ key: p.id, url: p.storageKey }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          {totalCount} / {maxPhotos} photos
          {mode === "create" ? ` — keep ${minPhotos}–${maxPhotos}` : ""}
        </p>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item, i) => (
            <div
              key={item.key}
              draggable
              onDragStart={() => onDragStart(item.key)}
              onDragOver={(e) => onDragOverItem(e, item.key)}
              onDragEnd={onDragEnd}
              className={`group relative aspect-square overflow-hidden rounded-input border-2 ${
                dragKey === item.key ? "opacity-40" : "border-transparent"
              } ${busyKey === item.key ? "pointer-events-none opacity-50" : ""}`}
            >
              <button
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="absolute inset-0"
                aria-label={`Preview photo ${i + 1}`}
              >
                <Image
                  src={item.url}
                  alt={`Photo ${i + 1}`}
                  fill
                  sizes="(min-width: 640px) 25vw, 50vw"
                  className="object-cover"
                />
              </button>

              {i === 0 && (
                <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
                  Cover
                </span>
              )}

              <span
                className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
                title="Drag to reorder"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <circle cx="6" cy="5" r="1.3" />
                  <circle cx="6" cy="10" r="1.3" />
                  <circle cx="6" cy="15" r="1.3" />
                  <circle cx="14" cy="5" r="1.3" />
                  <circle cx="14" cy="10" r="1.3" />
                  <circle cx="14" cy="15" r="1.3" />
                </svg>
              </span>

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleSetCover(item.key)}
                    className="rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-white"
                  >
                    Set as cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(item.key)}
                  aria-label={`Delete photo ${i + 1}`}
                  className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-alert-ink hover:bg-white"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path
                      fillRule="evenodd"
                      d="M8 2a1 1 0 0 0-1 1v1H4a1 1 0 0 0 0 2h.5l.7 10.1A2 2 0 0 0 7.2 18h5.6a2 2 0 0 0 2-1.9L15.5 6H16a1 1 0 1 0 0-2h-3V3a1 1 0 0 0-1-1H8Zm1 5a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0V7Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {uploading.length > 0 && (
        <div className="space-y-1.5">
          {uploading.map((u) => (
            <div key={u.name} className="text-xs text-muted">
              <p>Uploading {u.name}…</p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-chip">
                <div className="h-full bg-brand transition-all" style={{ width: `${u.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {totalCount < maxPhotos && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => {
              handleFilesSelected(e.target.files);
              e.target.value = "";
            }}
            className="w-full rounded-input border border-border-input bg-surface px-4 py-3 text-[15px] text-foreground file:mr-3 file:rounded-control file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-input bg-alert-soft px-3 py-2 text-sm text-alert-ink">
          {error}
        </p>
      )}

      {/* Only used in create mode — carries the current, user-reordered file list into the
          main form's submission. Kept in sync via a DataTransfer on every add/reorder/remove
          because a real <input type="file"> can't have its files set directly by React. */}
      {mode === "create" && (
        <input ref={submitFileInputRef} type="file" name="photos" multiple className="hidden" />
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photoUrls}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          alt="Listing"
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

function uploadWithProgress(
  listingId: string,
  files: File[],
  onProgress: (fileIndex: number, pct: number) => void,
): Promise<{ error?: string; photos?: ExistingPhoto[] }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    files.forEach((f) => formData.append("photos", f));

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        files.forEach((_, i) => onProgress(i, pct));
      }
    });
    xhr.addEventListener("load", () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve({ photos: body.photos });
        else resolve({ error: body.error ?? "Upload failed." });
      } catch {
        resolve({ error: "Upload failed." });
      }
    });
    xhr.addEventListener("error", () => resolve({ error: "Upload failed. Check your connection." }));
    xhr.open("POST", `/api/listings/${listingId}/photos`);
    xhr.send(formData);
  });
}
