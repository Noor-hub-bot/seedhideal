"use client";

import { useActionState, useState } from "react";
import { completeProfileAction, type AuthActionState } from "@/lib/actions/auth";
import { CITIES } from "@/lib/constants";
import { AuthButton, AuthErrorText, AuthInput, AuthSelect } from "./ui";
import { CameraIcon, PhoneIcon, UserIcon } from "./icons";

export function CompleteProfileForm({
  defaultName,
  defaultAvatarUrl,
}: {
  defaultName?: string;
  defaultAvatarUrl?: string;
}) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(completeProfileAction, {});
  const [preview, setPreview] = useState<string | undefined>(defaultAvatarUrl);

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex justify-center">
        <label className="group relative flex h-24 w-24 cursor-pointer items-center justify-center rounded-full bg-slate-100">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Avatar preview" className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <UserIcon className="h-10 w-10 text-slate-400" />
          )}
          <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#14BBA4] text-white ring-2 ring-white">
            <CameraIcon className="h-4 w-4" />
          </span>
          <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onAvatarChange} />
        </label>
      </div>

      <AuthInput
        label="Full Name"
        name="fullName"
        placeholder="Enter your full name"
        icon={<UserIcon className="h-[18px] w-[18px]" />}
        defaultValue={defaultName}
        autoComplete="name"
        required
      />
      <AuthInput
        label="Phone Number (Optional)"
        name="phone"
        type="tel"
        placeholder="Enter your phone number"
        icon={<PhoneIcon className="h-[18px] w-[18px]" />}
        autoComplete="tel"
      />
      <AuthSelect label="City" name="city" defaultValue="" required>
        <option value="" disabled>
          Select your city
        </option>
        {CITIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </AuthSelect>

      <AuthErrorText>{state.error}</AuthErrorText>

      <AuthButton type="submit" disabled={pending}>
        {pending ? "Saving…" : "Finish Setup"}
      </AuthButton>
    </form>
  );
}
