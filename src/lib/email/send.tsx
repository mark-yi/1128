import { Resend } from "resend";
import { render } from "@react-email/components";
import { FormFollowUpEmail } from "@/emails/FormFollowUpEmail";
import {
  interpolate,
  type FormDefinition,
} from "@/lib/forms/schema";

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendFollowUpEmail(input: {
  form: FormDefinition;
  to: string;
  firstName: string;
  fullName: string;
  email: string;
}): Promise<{ id: string | null; mocked: boolean; error?: string }> {
  if (!input.to) {
    return { id: null, mocked: true, error: "No email address" };
  }

  const from =
    process.env.RESEND_FROM ?? "1128 Church <onboarding@resend.dev>";

  const vars = {
    firstName: input.firstName || "friend",
    fullName: input.fullName || input.firstName || "friend",
    email: input.email,
  };

  const subject = interpolate(input.form.email.subject, vars);
  const html = await render(
    <FormFollowUpEmail email={input.form.email} subjectVars={vars} />,
  );

  if (!isResendConfigured()) {
    console.info("[resend] mock send", { to: input.to, subject, form: input.form.slug });
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
