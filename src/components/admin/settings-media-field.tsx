import Image from "next/image";
import { Input } from "@/components/ui";
import { Field } from "./settings-form";

/** One upload field with a small preview of the currently-live asset — reused across
 * Homepage (hero background), SEO (OG/Twitter images) and Media tabs instead of
 * duplicating the same "thumbnail + file input" markup per field. Uses the same plain
 * `<Input type="file">` this codebase already uses for uploads elsewhere (dealer profile
 * logo/cover) rather than a custom dropzone. */
export function MediaField({ label, name, hint, currentUrl }: { label: string; name: string; hint?: string; currentUrl?: string | null }) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-4">
        {currentUrl ? (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-input border border-border-input bg-neutral-chip">
            <Image src={currentUrl} alt="" width={64} height={64} className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-input border border-dashed border-border-input text-[10px] text-muted">
            None
          </div>
        )}
        <Input type="file" name={name} accept="image/jpeg,image/png,image/webp" className="flex-1" />
      </div>
    </Field>
  );
}
