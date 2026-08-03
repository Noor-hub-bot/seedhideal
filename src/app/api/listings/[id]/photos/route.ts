import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db, listingPhotos } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { loadOwnedListing } from "@/lib/actions/marketplace";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  detectFileType,
  uploadListingPhoto,
} from "@/lib/storage";

// Live "add more photos" for the edit page's photo manager — a Route Handler rather than
// a Server Action specifically so the client can drive it with XMLHttpRequest and get real
// upload-progress events (fetch/Server Actions have no byte-level progress API). Reuses
// the exact same validation as submitListingAction/editListingAction.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: listingId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const listing = await loadOwnedListing(listingId, user.id);
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  const formData = await request.formData();
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return NextResponse.json({ error: "No photos received." }, { status: 400 });

  const existing = await db
    .select()
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId))
    .orderBy(asc(listingPhotos.sortOrder));

  if (existing.length + files.length > MAX_PHOTOS) {
    return NextResponse.json(
      { error: `A listing can have at most ${MAX_PHOTOS} photos (${existing.length} already there).` },
      { status: 400 },
    );
  }

  for (const file of files) {
    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Photos must be JPG, PNG or WEBP." }, { status: 400 });
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Each photo must be under 6MB." }, { status: 400 });
    }
    const actualType = detectFileType(new Uint8Array(await file.arrayBuffer()));
    if (actualType !== file.type) {
      return NextResponse.json(
        { error: "One of your photos doesn't look like a valid JPG, PNG or WEBP file." },
        { status: 400 },
      );
    }
  }

  const inserted: { id: string; storageKey: string }[] = [];
  for (const [index, file] of files.entries()) {
    const storageKey = await uploadListingPhoto(file, listingId);
    const [row] = await db
      .insert(listingPhotos)
      .values({ listingId, kind: "other", storageKey, sortOrder: existing.length + index })
      .returning({ id: listingPhotos.id, storageKey: listingPhotos.storageKey });
    inserted.push(row);
  }

  revalidatePath(`/cars/${listingId}`);
  revalidatePath("/dashboard/listings");
  return NextResponse.json({ photos: inserted });
}
