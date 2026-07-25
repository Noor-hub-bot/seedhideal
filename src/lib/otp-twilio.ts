import twilio from "twilio";

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) throw new Error("Twilio credentials are not configured.");
    client = twilio(sid, token);
  }
  return client;
}

function getServiceSid(): string {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!serviceSid) throw new Error("TWILIO_VERIFY_SERVICE_SID is not configured.");
  return serviceSid;
}

export async function twilioStartVerification(
  phone: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await getClient().verify.v2.services(getServiceSid()).verifications.create({
      to: phone,
      channel: "sms",
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not send verification code. Please try again." };
  }
}

export async function twilioCheckVerification(
  phone: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const check = await getClient().verify.v2.services(getServiceSid()).verificationChecks.create({
      to: phone,
      code,
    });
    if (check.status === "approved") return { ok: true };
    return { ok: false, error: "Incorrect code. Please check and try again." };
  } catch {
    return { ok: false, error: "Code expired or not found. Request a new one." };
  }
}
