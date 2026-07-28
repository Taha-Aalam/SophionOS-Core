import { Resend } from "resend";
import type { ComposedEmail } from "./compose-brief";

export function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

export async function sendBriefEmail(input: {
  to: string;
  mail: ComposedEmail;
  resend?: Resend;
}): Promise<{ id: string | null }> {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not set");
  const resend = input.resend ?? getResendClient();
  const result = await resend.emails.send({
    from,
    to: input.to,
    subject: input.mail.subject,
    text: input.mail.text,
    html: input.mail.html,
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
  return { id: result.data?.id ?? null };
}
