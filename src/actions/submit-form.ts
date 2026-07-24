"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getForm } from "@/lib/forms/registry";
import { extractContact, validateStepValue, type Answers } from "@/lib/forms/schema";
import {
  findSubmissionByIdempotencyKey,
  insertEmailEvent,
  insertSubmission,
  isUsingMemoryStore,
} from "@/lib/db";
import { upsertPerson } from "@/lib/pco/client";
import { sendFollowUpEmail } from "@/lib/email/send";
import { rateLimit } from "@/lib/rate-limit";

const payloadSchema = z.object({
  slug: z.string().min(1),
  answers: z.record(z.string(), z.unknown()),
  idempotencyKey: z.string().min(8).max(128),
  website: z.string().optional(), // honeypot
});

export type SubmitResult =
  | { ok: true; submissionId: string; mocked: { pco: boolean; email: boolean; db: boolean } }
  | { ok: false; error: string };

export async function submitFormAction(raw: {
  slug: string;
  answers: Answers;
  idempotencyKey: string;
  website?: string;
}): Promise<SubmitResult> {
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid submission" };
  }

  // honeypot
  if (parsed.data.website) {
    return { ok: true, submissionId: "ignored", mocked: { pco: true, email: true, db: true } };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";
  const limited = rateLimit(`submit:${ip}:${parsed.data.slug}`, 10, 60_000);
  if (!limited.ok) {
    return { ok: false, error: `Too many submissions. Try again in ${limited.retryAfterSec}s.` };
  }

  const form = getForm(parsed.data.slug);
  if (!form) return { ok: false, error: "Form not found" };

  const answers = parsed.data.answers as Answers;

  for (const step of form.steps) {
    const result = validateStepValue(step, answers[step.id] ?? null);
    if (!result.ok) {
      return { ok: false, error: result.message };
    }
  }

  const existing = await findSubmissionByIdempotencyKey(parsed.data.idempotencyKey);
  if (existing) {
    return {
      ok: true,
      submissionId: existing.id,
      mocked: { pco: false, email: false, db: isUsingMemoryStore() },
    };
  }

  const contact = extractContact(answers);
  if (!contact.email) {
    return { ok: false, error: "Email is required" };
  }

  const prayer =
    typeof answers.prayer === "string"
      ? answers.prayer
      : typeof answers.notes === "string"
        ? answers.notes
        : "";

  let pcoPersonId: string | null = null;
  let pcoMocked = true;

  try {
    const pco = await upsertPerson({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      source: form.pco.source,
      stage: form.pco.stage,
      notes: [
        `Form: ${form.slug}`,
        prayer ? `Prayer/notes: ${prayer}` : null,
        `Answers: ${JSON.stringify(answers)}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    pcoPersonId = pco.personId;
    pcoMocked = pco.mocked;
  } catch (err) {
    console.error("[submit] PCO upsert failed", err);
    // Continue — still capture submission locally
  }

  const submission = await insertSubmission({
    formSlug: form.slug,
    answers,
    email: contact.email,
    name: contact.fullName,
    phone: contact.phone,
    pcoPersonId,
    status: pcoPersonId ? "synced" : "received",
    idempotencyKey: parsed.data.idempotencyKey,
  });

  const emailResult = await sendFollowUpEmail({
    template: form.emailTemplate,
    to: contact.email,
    firstName: contact.firstName || contact.fullName,
  });

  await insertEmailEvent({
    submissionId: submission.id,
    template: form.emailTemplate,
    resendId: emailResult.id,
    status: emailResult.error ? "error" : emailResult.mocked ? "mocked" : "sent",
    error: emailResult.error ?? null,
  });

  return {
    ok: true,
    submissionId: submission.id,
    mocked: {
      pco: pcoMocked,
      email: emailResult.mocked,
      db: isUsingMemoryStore(),
    },
  };
}
