import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Heading } from "@/components/ui";
import { NewTicketForm } from "./new-ticket-form";

export const metadata: Metadata = { title: "New support ticket" };

export default async function NewTicketPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/dashboard/support/new");

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Heading size="lg" className="mb-6">
        New support ticket
      </Heading>
      <NewTicketForm />
    </div>
  );
}
