import { Resend } from "resend";

export interface EmailAdapter {
  send(to: string, subject: string, html: string): Promise<void>;
}

class ConsoleEmailAdapter implements EmailAdapter {
  async send(to: string, subject: string, html: string) {
    console.log(`\n[SeedhiDeal DEV] Email to ${to}: ${subject}\n${html}\n`);
  }
}

class ResendEmailAdapter implements EmailAdapter {
  async send(to: string, subject: string, html: string) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: "SeedhiDeal <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    if (error) throw new Error(error.message);
  }
}

function resolveAdapter(): EmailAdapter {
  if (process.env.OTP_DEV_MODE === "true") return new ConsoleEmailAdapter();
  return new ResendEmailAdapter();
}

const PURPOSE_COPY: Record<"verify_email" | "reset_password", { subject: string; heading: string; body: string }> = {
  verify_email: {
    subject: "Verify your email — SeedhiDeal",
    heading: "Verify your email",
    body: "Enter this code to verify your email address and finish creating your account.",
  },
  reset_password: {
    subject: "Reset your password — SeedhiDeal",
    heading: "Reset your password",
    body: "Enter this code to reset your SeedhiDeal password.",
  },
};

export function buildOtpEmailHtml(code: string, purpose: "verify_email" | "reset_password"): string {
  const copy = PURPOSE_COPY[purpose];
  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0F172A;">
      <p style="font-size: 20px; font-weight: 700; margin: 0 0 24px;">SeedhiDeal</p>
      <h1 style="font-size: 20px; margin: 0 0 12px;">${copy.heading}</h1>
      <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 24px;">${copy.body}</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background: #F8FAFC; border-radius: 12px; padding: 16px 24px; text-align: center; color: #0F172A;">
        ${code}
      </div>
      <p style="font-size: 13px; color: #94A3B8; margin: 24px 0 0;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  `;
}

export async function sendOtpEmail(
  email: string,
  code: string,
  purpose: "verify_email" | "reset_password",
): Promise<void> {
  const copy = PURPOSE_COPY[purpose];
  await resolveAdapter().send(email, copy.subject, buildOtpEmailHtml(code, purpose));
}

/** The Email settings tab's "Test Email" button — sends through the exact same adapter
 * (console log in dev mode, Resend in production) as every real transactional email, so
 * a successful test genuinely confirms the configured path works end to end. */
export async function sendTestEmail(to: string): Promise<void> {
  await resolveAdapter().send(
    to,
    "Test email — SeedhiDeal admin settings",
    `<div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0F172A;">
      <p style="font-size: 20px; font-weight: 700; margin: 0 0 24px;">SeedhiDeal</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;">This is a test email sent from the admin Website Settings page to confirm outbound email is configured correctly.</p>
    </div>`,
  );
}

/** Read-only Email tab info — real, currently-hardcoded values (no separate SMTP
 * settings exist to manage; only Resend's API key, an env var, does). */
export function getEmailConfigSummary(): { provider: string; senderName: string; senderEmail: string; configured: boolean } {
  const devMode = process.env.OTP_DEV_MODE === "true";
  return {
    provider: devMode ? "Console (dev mode)" : "Resend",
    senderName: "SeedhiDeal",
    senderEmail: "onboarding@resend.dev",
    configured: devMode || !!process.env.RESEND_API_KEY,
  };
}
