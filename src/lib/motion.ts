import type { Transition, Variants } from "motion/react";

export type Direction = 1 | -1;

export const stepTransition: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 34,
  mass: 0.8,
};

export const reducedStepTransition: Transition = {
  duration: 0.15,
  ease: "easeOut",
};

export const stepVariants: Variants = {
  enter: (dir: Direction) => ({
    y: dir > 0 ? 28 : -28,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
  },
  exit: (dir: Direction) => ({
    y: dir > 0 ? -28 : 28,
    opacity: 0,
  }),
};

export const reducedStepVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 420, damping: 32 },
  },
};

export const reducedStaggerItem: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.12 } },
};

export const shakeVariants: Variants = {
  idle: { x: 0 },
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.42 },
  },
};

export const choiceSpring: Transition = {
  type: "spring",
  stiffness: 460,
  damping: 28,
};
