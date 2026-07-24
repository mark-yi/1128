import { newcomerForm } from "./newcomer";
import { volunteerForm } from "./volunteer";
import type { FormDefinition } from "./schema";

const forms: Record<string, FormDefinition> = {
  [newcomerForm.slug]: newcomerForm,
  [volunteerForm.slug]: volunteerForm,
};

export function getForm(slug: string): FormDefinition | null {
  return forms[slug] ?? null;
}

export function listForms(): FormDefinition[] {
  return Object.values(forms);
}
