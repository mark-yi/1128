"use client";

import { motion, useReducedMotion } from "motion/react";
import { brand } from "@/lib/brand";
import type { FormDefinition } from "@/lib/forms/schema";

export function SuccessScreen({
  form,
  name,
}: {
  form: FormDefinition;
  name: string;
}) {
  const reduced = useReducedMotion();
  const personalize = form.success.personalizeWithName !== false && name;
  const title = personalize
    ? `${form.success.title.replace(/\.$/, "")}, ${name}.`
    : form.success.title;

  return (
    <div className="form-shell flex min-h-dvh flex-col items-center justify-center px-5 py-16 sm:px-8">
      <div className="mx-auto w-full max-w-lg text-center">
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 340, damping: 24 }}
          className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent)] text-white"
          aria-hidden
        >
          <motion.svg
            viewBox="0 0 24 24"
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M5 13l4 4L19 7"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.15, duration: 0.45, ease: "easeOut" }}
            />
          </motion.svg>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: reduced ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="font-display text-[1.35rem] text-[var(--color-accent-dark)]"
        >
          {brand.name}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: reduced ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-3 font-display text-[2rem] leading-tight font-medium tracking-[-0.02em] text-[var(--color-text)] text-balance sm:text-[2.6rem]"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: reduced ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[var(--color-text-soft)] sm:text-lg"
        >
          {form.success.body}
        </motion.p>

        {form.success.secondary ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.34 }}
            className="mt-6 text-sm tracking-wide text-[var(--color-muted)]"
          >
            {form.success.secondary}
          </motion.p>
        ) : null}

        {form.success.ctaHref && form.success.ctaLabel ? (
          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10"
          >
            <a
              href={form.success.ctaHref}
              className="btn-primary inline-flex min-h-12 items-center px-6"
            >
              {form.success.ctaLabel}
            </a>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
