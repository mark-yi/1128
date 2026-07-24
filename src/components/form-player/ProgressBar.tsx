"use client";

import { motion } from "motion/react";

export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <div
      className="fixed inset-x-0 top-0 z-20 h-[3px] bg-[var(--color-line)]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      aria-label={label}
    >
      <motion.div
        className="h-full origin-left bg-[var(--color-accent)]"
        initial={false}
        animate={{ scaleX: clamped }}
        transition={{ type: "spring", stiffness: 280, damping: 36 }}
        style={{ transformOrigin: "0% 50%" }}
      />
    </div>
  );
}
