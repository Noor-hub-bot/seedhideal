import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { createOtpChallenge, normalizePkPhone } = await import("../src/lib/auth");

  const raw = process.argv[2];
  if (!raw) {
    console.error("Usage: tsx scripts/dev-send-otp.ts <phone>");
    process.exit(1);
  }

  const phone = normalizePkPhone(raw);
  if (!phone) {
    console.error(`Invalid Pakistani phone number: ${raw}`);
    process.exit(1);
  }

  const result = await createOtpChallenge(phone);
  console.log(result);
  process.exit(0);
}

main();
