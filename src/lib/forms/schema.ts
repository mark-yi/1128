import { z } from "zod";

/** Semantic roles — how the engine maps answers to contact / CRM / email. */
export const fieldRoleSchema = z.enum([
  "first_name",
  "last_name",
  "full_name",
  "email",
  "phone",
  "notes",
  "none",
]);

export type FieldRole = z.infer<typeof fieldRoleSchema>;

export const choiceOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

const stepBase = {
  id: z.string().min(1),
  title: z.string().min(1),
  help: z.string().optional(),
  required: z.boolean().optional(),
  role: fieldRoleSchema.optional(),
};

export const statementStepSchema = z.object({
  ...stepBase,
  type: z.literal("statement"),
  body: z.string().optional(),
});

export const textStepSchema = z.object({
  ...stepBase,
  type: z.enum(["short_text", "name", "email", "phone", "long_text"]),
  placeholder: z.string().optional(),
  autoComplete: z.string().optional(),
});

export const choiceStepSchema = z.object({
  ...stepBase,
  type: z.enum(["single_choice", "multi_choice", "yes_no"]),
  options: z.array(choiceOptionSchema).min(1),
  autoAdvance: z.boolean().optional(),
});

export const stepSchema = z.discriminatedUnion("type", [
  statementStepSchema,
  textStepSchema,
  choiceStepSchema,
]);

/** Schema-driven follow-up email — one generic renderer for all forms. */
export const formEmailSchema = z.object({
  subject: z.string().min(1),
  preview: z.string().optional(),
  heading: z.string().min(1),
  body: z.array(z.string().min(1)).min(1),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  footer: z.string().optional(),
});

export const formSuccessSchema = z.object({
  title: z.string(),
  body: z.string(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  secondary: z.string().optional(),
  /** When true, success title becomes "{title}, {firstName}." */
  personalizeWithName: z.boolean().optional(),
});

export const formPcoSchema = z.object({
  source: z.string().min(1),
  stage: z.string().min(1),
  /** Include full pretty-printed answers in the PCO note. Default true. */
  includeAnswers: z.boolean().optional(),
  workflowName: z.string().optional(),
});

export const formDefinitionSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().optional().default(true),
  success: formSuccessSchema,
  email: formEmailSchema,
  pco: formPcoSchema,
  steps: z.array(stepSchema).min(1),
});

export type ChoiceOption = z.infer<typeof choiceOptionSchema>;
export type StatementStep = z.infer<typeof statementStepSchema>;
export type TextStep = z.infer<typeof textStepSchema>;
export type ChoiceStep = z.infer<typeof choiceStepSchema>;
export type Step = z.infer<typeof stepSchema>;
export type FormEmail = z.infer<typeof formEmailSchema>;
export type FormDefinition = z.infer<typeof formDefinitionSchema>;

export type AnswerValue = string | string[] | boolean | null;
export type Answers = Record<string, AnswerValue>;

export type Contact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  fullName: string;
};

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

/** Infer role from step type/id when authors omit `role`. */
export function resolveRole(step: Step): FieldRole {
  if (step.role) return step.role;
  if (step.type === "email") return "email";
  if (step.type === "phone") return "phone";
  if (step.type === "name") {
    if (step.id.includes("last")) return "last_name";
    if (step.id.includes("first")) return "first_name";
    return "full_name";
  }
  if (step.id === "email") return "email";
  if (step.id === "phone") return "phone";
  if (step.id === "first_name") return "first_name";
  if (step.id === "last_name") return "last_name";
  if (step.id === "name" || step.id === "full_name") return "full_name";
  if (step.id === "prayer" || step.id === "notes") return "notes";
  return "none";
}

export function stepsWithRole(form: FormDefinition, role: FieldRole): Step[] {
  return form.steps.filter((step) => resolveRole(step) === role);
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
    if (step.type === "email" || resolveRole(step) === "email") {
      const emailOk = z.email().safeParse(text).success;
      if (!emailOk) return { ok: false, message: "Enter a valid email" };
    }
    if (step.type === "phone" || resolveRole(step) === "phone") {
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

function stringAnswer(answers: Answers, stepId: string): string {
  const value = answers[stepId];
  return typeof value === "string" ? value.trim() : "";
}

export function extractContact(
  form: FormDefinition,
  answers: Answers,
): Contact {
  let firstName = "";
  let lastName = "";
  let fullName = "";
  let email = "";
  let phone = "";

  for (const step of form.steps) {
    const role = resolveRole(step);
    const text = stringAnswer(answers, step.id);
    if (!text) continue;

    switch (role) {
      case "first_name":
        firstName = text;
        break;
      case "last_name":
        lastName = text;
        break;
      case "full_name":
        fullName = text;
        break;
      case "email":
        email = text;
        break;
      case "phone":
        phone = text;
        break;
      default:
        break;
    }
  }

  if (!firstName && fullName) {
    const parts = fullName.split(/\s+/);
    firstName = parts[0] ?? "";
    lastName = parts.slice(1).join(" ");
  }

  const composed =
    [firstName, lastName].filter(Boolean).join(" ") || fullName || "Friend";

  return {
    firstName: firstName || composed.split(/\s+/)[0] || "Friend",
    lastName,
    email,
    phone,
    fullName: composed,
  };
}

export function extractNotes(form: FormDefinition, answers: Answers): string {
  return stepsWithRole(form, "notes")
    .map((step) => {
      const text = stringAnswer(answers, step.id);
      return text ? `${step.title}\n${text}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

/** Human-readable answers using step titles + choice labels. */
export function formatAnswersForNotes(
  form: FormDefinition,
  answers: Answers,
): string {
  const lines: string[] = [];

  for (const step of form.steps) {
    if (step.type === "statement") continue;
    const raw = answers[step.id];
    if (raw == null || raw === "" || (Array.isArray(raw) && raw.length === 0)) {
      continue;
    }

    let display: string;
    if (isChoiceStep(step)) {
      const values = Array.isArray(raw) ? raw : [String(raw)];
      display = values
        .map(
          (value) =>
            step.options.find((option) => option.value === value)?.label ??
            value,
        )
        .join(", ");
    } else {
      display = String(raw);
    }

    lines.push(`${step.title}: ${display}`);
  }

  return lines.join("\n");
}

/** Replace {{firstName}}, {{fullName}}, {{email}} in email copy. */
export function interpolate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function assertFormWellFormed(form: FormDefinition): void {
  const emailSteps = stepsWithRole(form, "email");
  if (emailSteps.length === 0) {
    throw new Error(
      `Form "${form.slug}" needs at least one step with role/type email`,
    );
  }
}
