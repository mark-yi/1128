"use client";

import { motion } from "motion/react";
import { resolveRole, type TextStep } from "@/lib/forms/schema";

export function TextField({
  step,
  value,
  onChange,
  inputRef,
}: {
  step: TextStep;
  value: string;
  onChange: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}) {
  const shared =
    "field-input w-full bg-transparent text-[1.15rem] text-[var(--color-text)] outline-none placeholder:text-[var(--color-placeholder)] sm:text-[1.35rem]";

  const role = resolveRole(step);

  if (step.type === "long_text") {
    return (
      <motion.div layout className="field-shell">
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          rows={3}
          placeholder={step.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${shared} min-h-[7rem] resize-none leading-relaxed`}
          autoComplete="off"
        />
      </motion.div>
    );
  }

  const inputMode =
    step.type === "email" || role === "email"
      ? "email"
      : step.type === "phone" || role === "phone"
        ? "tel"
        : "text";

  const autoComplete =
    step.autoComplete ||
    (role === "email"
      ? "email"
      : role === "phone"
        ? "tel"
        : role === "last_name"
          ? "family-name"
          : role === "first_name"
            ? "given-name"
            : role === "full_name"
              ? "name"
              : "off");

  return (
    <motion.div layout className="field-shell">
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={step.type === "email" || role === "email" ? "email" : "text"}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        placeholder={step.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${shared} py-1`}
      />
    </motion.div>
  );
}
