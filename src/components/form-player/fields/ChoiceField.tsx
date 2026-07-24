"use client";

import { motion } from "motion/react";
import { choiceSpring } from "@/lib/motion";
import type { ChoiceStep } from "@/lib/forms/schema";

export function ChoiceField({
  step,
  value,
  onToggle,
  letterForIndex,
}: {
  step: ChoiceStep;
  value: string | string[];
  onToggle: (value: string) => void;
  letterForIndex: (index: number) => string;
}) {
  const multi = step.type === "multi_choice";

  return (
    <ul className="flex flex-col gap-2.5" role={multi ? "group" : "radiogroup"}>
      {step.options.map((option, index) => {
        const selected = multi
          ? Array.isArray(value) && value.includes(option.value)
          : value === option.value;
        const letter = letterForIndex(index);

        return (
          <li key={option.value}>
            <motion.button
              type="button"
              role={multi ? "checkbox" : "radio"}
              aria-checked={selected}
              onClick={() => onToggle(option.value)}
              whileTap={{ scale: 0.985 }}
              animate={{
                backgroundColor: selected
                  ? "rgba(196, 162, 101, 0.14)"
                  : "rgba(255,255,255,0.55)",
                borderColor: selected
                  ? "var(--color-accent)"
                  : "var(--color-line-strong)",
                scale: selected ? 1.01 : 1,
              }}
              transition={choiceSpring}
              className="flex w-full min-h-[3.35rem] items-center gap-3 rounded-md border px-3.5 py-3 text-left sm:min-h-[3.6rem] sm:px-4"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.35rem] border text-xs font-semibold tracking-wide ${
                  selected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                    : "border-[var(--color-line-strong)] bg-white/70 text-[var(--color-muted)]"
                }`}
              >
                {multi ? (selected ? "✓" : letter) : letter}
              </span>
              <span className="text-[1.02rem] leading-snug text-[var(--color-text)] sm:text-[1.1rem]">
                {option.label}
              </span>
            </motion.button>
          </li>
        );
      })}
    </ul>
  );
}
