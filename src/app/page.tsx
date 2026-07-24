import Link from "next/link";
import { brand } from "@/lib/brand";
import { listForms } from "@/lib/forms/registry";

export default function HomePage() {
  const forms = listForms();

  return (
    <div className="form-shell min-h-dvh px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <p className="font-display text-3xl text-[var(--color-accent-dark)] sm:text-4xl">
          {brand.name}
        </p>
        <h1 className="mt-4 font-display text-[2.4rem] leading-[1.1] font-medium tracking-[-0.02em] text-[var(--color-text)] sm:text-5xl">
          Forms that feel like Sunday hospitality.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-text-soft)] sm:text-lg">
          One question at a time. Calm motion. Answers land in Planning Center,
          with a branded welcome email — no Typeform bill.
        </p>

        <ul className="mt-12 flex flex-col gap-3">
          {forms.map((form) => (
            <li key={form.slug}>
              <Link
                href={`/f/${form.slug}`}
                className="group flex items-center justify-between gap-4 border border-[var(--color-line-strong)] bg-white/55 px-5 py-5 transition hover:border-[var(--color-accent)] hover:bg-white/80"
              >
                <div>
                  <p className="font-display text-2xl text-[var(--color-text)]">
                    {form.title}
                  </p>
                  {form.description ? (
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {form.description}
                    </p>
                  ) : null}
                </div>
                <span className="text-[var(--color-accent-dark)] transition group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm text-[var(--color-muted)]">
          Staff{" "}
          <Link href="/admin" className="underline underline-offset-4">
            view submissions
          </Link>
          {" · "}
          <Link href="/teams" className="underline underline-offset-4">
            team leaders
          </Link>
        </p>
      </div>
    </div>
  );
}
