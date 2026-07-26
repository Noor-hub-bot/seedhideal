import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthCard, AuthHeading } from "@/components/auth/ui";
import { CompleteProfileForm } from "@/components/auth/complete-profile-form";

export const metadata: Metadata = { title: "Complete Your Profile" };

export default async function CompleteProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  return (
    <AuthCard>
      <AuthHeading subtitle="Almost there! Please provide some information to get started.">
        Complete Your Profile
      </AuthHeading>
      <CompleteProfileForm defaultName={user.displayName ?? undefined} defaultAvatarUrl={user.avatarUrl ?? undefined} />
    </AuthCard>
  );
}
