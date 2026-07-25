export interface SmsAdapter {
  send(phone: string, message: string): Promise<void>;
}

class ConsoleSmsAdapter implements SmsAdapter {
  async send(phone: string, message: string) {
    console.log(`\n[SeedhiDeal DEV] SMS to ${phone}: ${message}\n`);
  }
}

// Swap this for a real provider (Twilio, Veevotech, etc.) once one is chosen —
// implement SmsAdapter and return it here instead of throwing.
function resolveAdapter(): SmsAdapter {
  if (process.env.OTP_DEV_MODE === "true") return new ConsoleSmsAdapter();
  throw new Error("SMS provider not configured. Set OTP_DEV_MODE=true for development.");
}

export async function sendSms(phone: string, message: string): Promise<void> {
  const adapter = resolveAdapter();
  await adapter.send(phone, message);
}
