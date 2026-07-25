import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { db, listings } from "@/db";
import { Badge, Card, Heading } from "@/components/ui";
import { formatKm, formatPkr } from "@/lib/format";

export const metadata: Metadata = { title: "Compare cars" };

const UUID_RE = /^[0-9a-f-]{36}$/;

type Search = { ids?: string };

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const ids = (params.ids ?? "").split(",").filter((id) => UUID_RE.test(id)).slice(0, 4);

  const results = ids.length
    ? await db
        .select()
        .from(listings)
        .where(and(inArray(listings.id, ids), eq(listings.status, "active")))
    : [];
  // Preserve the order the user selected them in.
  const byId = new Map(results.map((l) => [l.id, l]));
  const ordered = ids.map((id) => byId.get(id)).filter((l): l is NonNullable<typeof l> => !!l);

  const specs: [string, (l: (typeof ordered)[number]) => string][] = [
    ["Price", (l) => formatPkr(l.askingPricePkr)],
    ["Year", (l) => String(l.year)],
    ["Mileage", (l) => formatKm(l.mileageKm)],
    ["Transmission", (l) => (l.transmission === "automatic" ? "Automatic" : "Manual")],
    ["Fuel", (l) => l.fuel],
    ["Engine size", (l) => (l.engineCc ? `${l.engineCc}cc` : "—")],
    ["Body type", (l) => l.bodyType ?? "—"],
    ["Assembly", (l) => (l.assembly ? (l.assembly === "imported" ? "Imported" : "Local") : "—")],
    ["Exterior color", (l) => l.exteriorColor ?? "—"],
    ["City", (l) => l.city],
    ["Owners", (l) => l.ownershipCount?.toString() ?? "—"],
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Heading size="lg" className="mb-6">
        Compare cars
      </Heading>

      {ordered.length < 2 ? (
        <Card className="p-16 text-center text-sm text-muted">
          Select at least 2 cars to compare — tick &ldquo;Compare&rdquo; on any listing card in{" "}
          <Link href="/cars" className="font-semibold text-brand hover:text-brand-strong">
            Browse cars
          </Link>
          .
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-40 p-3 text-left text-muted" />
                {ordered.map((l) => (
                  <th key={l.id} className="p-3 text-left align-top">
                    <Link href={`/cars/${l.id}`} className="font-semibold text-brand hover:text-brand-strong">
                      {l.make} {l.model}
                      {l.variant ? ` ${l.variant}` : ""}
                    </Link>
                    {l.featured && (
                      <span className="ml-2">
                        <Badge tone="brand" className="whitespace-nowrap px-2 py-1 text-[11px]">
                          ★ Featured
                        </Badge>
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {specs.map(([label, get]) => (
                <tr key={label} className="border-t border-border">
                  <td className="p-3 font-medium text-muted">{label}</td>
                  {ordered.map((l) => (
                    <td key={l.id} className="p-3 capitalize">
                      {get(l)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
