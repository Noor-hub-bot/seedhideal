/**
 * Dev seed: one admin, one verified demo seller, six active listings.
 * Run: npm run db:seed
 * Sign in as admin with +92 300 0000000, seller with +92 300 0000001
 * (dev-mode OTP prints in the server console).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { db, users, verificationCases, listings, listingPhotos, featuredPlans } = await import("./index");
  const { eq } = await import("drizzle-orm");

  const existingPlans = await db.select().from(featuredPlans);
  if (existingPlans.length === 0) {
    await db.insert(featuredPlans).values([
      { name: "7-Day Boost", durationDays: 7, priority: 1, pricePkr: 500 },
      { name: "30-Day Boost", durationDays: 30, priority: 2, pricePkr: 1500 },
      { name: "Top Placement", durationDays: 30, priority: 3, pricePkr: 3000 },
    ]);
    console.log("Seeded: 3 featured plans.");
  }

  async function upsertUser(
    phone: string,
    displayName: string,
    role: "user" | "admin",
    city: string,
  ) {
    const existing = await db.select().from(users).where(eq(users.phone, phone));
    if (existing[0]) return existing[0];
    const [u] = await db
      .insert(users)
      .values({ phone, displayName, role, city })
      .returning();
    return u;
  }

  const admin = await upsertUser("+923000000000", "SeedhiDeal Ops", "admin", "Lahore");
  const seller = await upsertUser("+923000000001", "Ahmed R.", "user", "Lahore");

  const hasCase = await db
    .select()
    .from(verificationCases)
    .where(eq(verificationCases.userId, seller.id));
  if (!hasCase[0]) {
    await db.insert(verificationCases).values({
      userId: seller.id,
      status: "verified",
      relationship: "owner",
      reviewerId: admin.id,
      reviewedAt: new Date(),
    });
  }

  const existingListings = await db
    .select()
    .from(listings)
    .where(eq(listings.sellerId, seller.id));
  if (existingListings.length > 0) {
    console.log("Seed listings already present — skipping.");
    return;
  }

  const cars = [
    { make: "Toyota", model: "Corolla", variant: "Altis 1.6", year: 2021, mileageKm: 48000, transmission: "automatic", fuel: "petrol", engineCc: 1600, bodyType: "Sedan", exteriorColor: "White", interiorColor: "Beige", assembly: "local", askingPricePkr: 6_450_000, paint: "None", accidents: "None", mech: "None", docs: "Complete file, both keys" },
    { make: "Honda", model: "Civic", variant: "Oriel", year: 2019, mileageKm: 71000, transmission: "automatic", fuel: "petrol", engineCc: 1800, bodyType: "Sedan", exteriorColor: "Black", interiorColor: "Black", assembly: "local", askingPricePkr: 6_950_000, paint: "Front bumper repainted", accidents: "Minor front bump 2022, repaired", mech: "None", docs: "Complete file" },
    { make: "Suzuki", model: "Alto", variant: "VXL AGS", year: 2022, mileageKm: 23000, transmission: "automatic", fuel: "petrol", engineCc: 660, bodyType: "Hatchback", exteriorColor: "Silver", interiorColor: "Grey", assembly: "local", askingPricePkr: 2_750_000, paint: "None", accidents: "None", mech: "None", docs: "Complete file, biometric ready" },
    { make: "Suzuki", model: "Cultus", variant: "VXR", year: 2020, mileageKm: 54000, transmission: "manual", fuel: "petrol", engineCc: 1000, bodyType: "Hatchback", exteriorColor: "Red", interiorColor: "Black", assembly: "local", askingPricePkr: 2_950_000, paint: "One door repainted", accidents: "None", mech: "AC needs regassing", docs: "Complete file" },
    { make: "Honda", model: "City", variant: "1.2 CVT", year: 2023, mileageKm: 18000, transmission: "automatic", fuel: "petrol", engineCc: 1200, bodyType: "Sedan", exteriorColor: "Blue", interiorColor: "Black", assembly: "imported", askingPricePkr: 4_850_000, paint: "None", accidents: "None", mech: "None", docs: "Complete file, under warranty", photo: "/cars/honda-city-1.2-cvt-2023.jpg" },
    { make: "Toyota", model: "Yaris", variant: "ATIV X", year: 2022, mileageKm: 31000, transmission: "automatic", fuel: "petrol", engineCc: 1500, bodyType: "Sedan", exteriorColor: "Grey", interiorColor: "Beige", assembly: "local", askingPricePkr: 4_350_000, paint: "None", accidents: "None", mech: "None", docs: "Complete file, both keys", photo: "/cars/toyota-yaris-ativ-x-2022.jpg" },
  ] as const;

  for (const c of cars) {
    const [inserted] = await db
      .insert(listings)
      .values({
        sellerId: seller.id,
        status: "active",
        make: c.make,
        model: c.model,
        variant: c.variant,
        year: c.year,
        city: "Lahore",
        registrationCity: "Lahore",
        mileageKm: c.mileageKm,
        transmission: c.transmission,
        fuel: c.fuel,
        engineCc: c.engineCc,
        bodyType: c.bodyType,
        exteriorColor: c.exteriorColor,
        interiorColor: c.interiorColor,
        assembly: c.assembly,
        askingPricePkr: c.askingPricePkr,
        ownershipCount: 1,
        disclosures: {
          paintedPanels: c.paint,
          accidentHistory: c.accidents,
          mechanicalIssues: c.mech,
          documents: c.docs,
        },
        approvedAt: new Date(),
        expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      })
      .returning();

    if ("photo" in c && c.photo) {
      await db.insert(listingPhotos).values({
        listingId: inserted.id,
        kind: "front",
        storageKey: c.photo,
      });
    }
  }

  console.log("Seeded: 1 admin, 1 verified seller, 6 active listings.");
}

main().then(() => process.exit(0));
