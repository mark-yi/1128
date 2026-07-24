"use client";

import { motion, type Variants } from "motion/react";

export function QuestionHeader({
  id,
  number,
  title,
  help,
  body,
  variants,
}: {
  id: string;
  number: number;
  title: string;
  help?: string;
  body?: string;
  variants: Variants;
}) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <motion.p
        variants={variants}
        className="font-sans text-xs font-medium tracking-[0.18em] text-[var(--color-accent-dark)] uppercase"
      >
        {String(number).padStart(2, "0")}
      </motion.p>
      <motion.h1
        id={id}
        variants={variants}
        className="font-display text-[1.85rem] leading-[1.15] font-medium tracking-[-0.02em] text-[var(--color-text)] text-balance sm:text-[2.55rem] sm:leading-[1.12]"
      >
        {title}
      </motion.h1>
      {body ? (
        <motion.p
          variants={variants}
          className="max-w-prose text-base leading-relaxed text-[var(--color-text-soft)] sm:text-lg"
        >
          {body}
        </motion.p>
      ) : null}
      {help ? (
        <motion.p
          variants={variants}
          className="text-sm leading-relaxed text-[var(--color-muted)] sm:text-[0.95rem]"
        >
          {help}
        </motion.p>
      ) : null}
    </div>
  );
}
