import { z } from "zod";

export const choiceOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

export const baseStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  help: z.string().optional(),
  required: z.boolean().optional(),
});

export const statementStepSchema = baseStepSchema.extend({
  type: z.literal("statement"),
  body: z.string().optional(),
});

export const textStepSchema = baseStepSchema.extend({
  type: z.enum(["short_text", "name", "email", "phone", "long_text"]),
  placeholder: z.string().optional(),
});

export const choiceStepSchema = baseStepSchema.extend({
  type: z.enum(["single_choice", "multi_choice", "yes_no"]),
  options: z.array(choiceOptionSchema).min(1),
  autoAdvance: z.boolean().optional(),
});

export const stepSchema = z.discriminatedUnion("type", [
  statementStepSchema,
  textStepSchema,
  choiceStepSchema,
]);

export const formDefinitionSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  success: z.object({
    title: z.string(),
    body: z.string(),
    ctaLabel: z.string().optional(),
    ctaHref: z.string().optional(),
    secondary: z.string().optional(),
  }),
  emailTemplate: z.enum(["welcome", "volunteer_thanks"]),
  pco: z.object({
    source: z.string(),
    stage: z.string(),
    workflowName: z.string().optional(),
  }),
  steps: z.array(stepSchema).min(1),
});

export type ChoiceOption = z.infer<typeof choiceOptionSchema>;
export type StatementStep = z.infer<typeof statementStepSchema>;
export type TextStep = z.infer<typeof textStepSchema>;
export type ChoiceStep = z.infer<typeof choiceStepSchema>;
export type Step = z.infer<typeof stepSchema>;
export type FormDefinition = z.infer<typeof formDefinitionSchema>;

export type AnswerValue = string | string[] | boolean | null;
export type Answers = Record<string, AnswerValue>;

export function isTextStep(step: Step): step is TextStep {
  return (
    step.type === "short_text" ||
    step.type === "name" ||
    step.type === "email" ||
    step.type === "phone" ||
    step.type === "long_text"
  );
}

export function isChoiceStep(step: Step): step is ChoiceStep {
  return (
    step.type === "single_choice" ||
    step.type === "multi_choice" ||
    step.type === "yes_no"
  );
}

export function validateStepValue(
  step: Step,
  value: AnswerValue,
): { ok: true } | { ok: false; message: string } {
  if (step.type === "statement") return { ok: true };

  const required = step.required !== false;

  if (isTextStep(step)) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) {
      if (!required) return { ok: true };
      return { ok: false, message: "This field is required" };
    }
    if (step.type === "email") {
      const emailOk = z.email().safeParse(text).success;
      if (!emailOk) return { ok: false, message: "Enter a valid email" };
    }
    if (step.type === "phone") {
      const digits = text.replace(/\D/g, "");
      if (digits.length < 10) {
        return { ok: false, message: "Enter a valid phone number" };
      }
    }
    return { ok: true };
  }

  if (step.type === "multi_choice") {
    const selected = Array.isArray(value) ? value : [];
    if (required && selected.length === 0) {
      return { ok: false, message: "Select at least one option" };
    }
    return { ok: true };
  }

  if (step.type === "single_choice" || step.type === "yes_no") {
    const text = typeof value === "string" ? value : "";
    if (required && !text) {
      return { ok: false, message: "Please make a selection" };
    }
    return { ok: true };
  }

  return { ok: true };
}

export function extractContact(answers: Answers): {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  fullName: string;
} {
  const firstName =
    (typeof answers.first_name === "string" && answers.first_name) ||
    (typeof answers.name === "string" ? answers.name.split(" ")[0] : "") ||
    "";
  const lastName =
    (typeof answers.last_name === "string" && answers.last_name) ||
    (typeof answers.name === "string"
      ? answers.name.split(" ").slice(1).join(" ")
      : "") ||
    "";
  const email = typeof answers.email === "string" ? answers.email.trim() : "";
  const phone = typeof answers.phone === "string" ? answers.phone.trim() : "";
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    (typeof answers.name === "string" ? answers.name : "") ||
    "Friend";

  return { firstName, lastName, email, phone, fullName };
}
