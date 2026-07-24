import { newcomerForm } from "./newcomer";
import { volunteerForm } from "./volunteer";
import { parseFormDefinition, type FormDefinition } from "./schema";

/**
 * Register forms here. Adding a form = add a schema file + one line in `catalog`.
 * Player, submit, email, and /f/[slug] pick it up automatically.
 * Every entry is validated against the published FormDefinition contract.
 */
const catalog: FormDefinition[] = [newcomerForm, volunteerForm];

function buildRegistry(forms: FormDefinition[]): Record<string, FormDefinition> {
  const map: Record<string, FormDefinition> = {};

  for (const raw of forms) {
    const form = parseFormDefinition(raw);
    if (map[form.slug]) {
      throw new Error(`Duplicate form slug: ${form.slug}`);
    }
    if (form.active === false) continue;
    map[form.slug] = form;
  }

  return map;
}

const forms = buildRegistry(catalog);

export function getForm(slug: string): FormDefinition | null {
  return forms[slug] ?? null;
}

export function listForms(): FormDefinition[] {
  return Object.values(forms);
}

export function listFormSlugs(): string[] {
  return Object.keys(forms);
}
