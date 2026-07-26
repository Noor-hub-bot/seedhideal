import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { createEmailOtpChallenge } = await import("../src/lib/auth");

  const email = process.argv[2];
  const purpose = process.argv[3] === "reset" ? "reset_password" : "verify_email";
  if (!email) {
    console.error("Usage: tsx scripts/dev-send-otp.ts <email> [reset]");
    process.exit(1);
  }

  const result = await createEmailOtpChallenge(email.trim().toLowerCase(), purpose);
  console.log(result);
  process.exit(0);
}

main();
