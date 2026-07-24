import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getForm, listForms } from "@/lib/forms/registry";
import { FormPlayer } from "@/components/form-player/FormPlayer";

export function generateStaticParams() {
  return listForms().map((form) => ({ slug: form.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const form = getForm(slug);
  if (!form) return { title: "Form" };
  return {
    title: form.title,
    description: form.description,
  };
}

export default async function FormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const form = getForm(slug);
  if (!form) notFound();

  return <FormPlayer form={form} />;
}
