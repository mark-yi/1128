import { Resend } from "resend";
import { render } from "@react-email/components";
import { WelcomeEmail } from "@/emails/WelcomeEmail";
import { VolunteerThanksEmail } from "@/emails/VolunteerThanksEmail";

export type EmailTemplate = "welcome" | "volunteer_thanks";

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendFollowUpEmail(input: {
  template: EmailTemplate;
  to: string;
  firstName: string;
}): Promise<{ id: string | null; mocked: boolean; error?: string }> {
  if (!input.to) {
    return { id: null, mocked: true, error: "No email address" };
  }

  const from =
    process.env.RESEND_FROM ?? "1128 Church <onboarding@resend.dev>";

  const element =
    input.template === "volunteer_thanks" ? (
      <VolunteerThanksEmail firstName={input.firstName} />
    ) : (
      <WelcomeEmail firstName={input.firstName} />
    );

  const html = await render(element);
  const subject =
    input.template === "volunteer_thanks"
      ? "Thanks for offering to serve at 1128"
      : "Welcome to 1128 — we’re glad you’re here";

  if (!isResendConfigured()) {
    console.info("[resend] mock send", { to: input.to, subject });
    return { id: `mock_${Date.now()}`, mocked: true };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from,
      to: input.to,
      subject,
      html,
    });

    if (result.error) {
      return { id: null, mocked: false, error: result.error.message };
    }

    return { id: result.data?.id ?? null, mocked: false };
  } catch (err) {
    return {
      id: null,
      mocked: false,
      error: err instanceof Error ? err.message : "Email send failed",
    };
  }
}
