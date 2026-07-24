"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  reducedStepTransition,
  reducedStepVariants,
  reducedStaggerItem,
  shakeVariants,
  staggerContainer,
  staggerItem,
  stepTransition,
  stepVariants,
  type Direction,
} from "@/lib/motion";
import {
  extractContact,
  isChoiceStep,
  isTextStep,
  validateStepValue,
  type Answers,
  type AnswerValue,
  type FormDefinition,
  type Step,
} from "@/lib/forms/schema";
import { ProgressBar } from "./ProgressBar";
import { QuestionHeader } from "./QuestionHeader";
import { FooterActions } from "./FooterActions";
import { TextField } from "./fields/TextField";
import { ChoiceField } from "./fields/ChoiceField";
import { StatementField } from "./fields/StatementField";
import { SuccessScreen } from "./SuccessScreen";
import { submitFormAction } from "@/actions/submit-form";

type Phase = "playing" | "submitting" | "success" | "error";

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  const motionHook = useReducedMotion();
  const media = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerSnapshot,
  );
  return Boolean(motionHook || media);
}

function letterForIndex(index: number) {
  return String.fromCharCode(65 + index);
}

export function FormPlayer({ form }: { form: FormDefinition }) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const formId = useId();

  const steps = form.steps;
  const step = steps[index];
  const total = steps.length;
  const progress = (index + 1) / total;
  const questionNumber = index + 1;

  const value = useMemo(
    () => answers[step.id] ?? (step.type === "multi_choice" ? [] : ""),
    [answers, step.id, step.type],
  );

  const variants = reduced ? reducedStepVariants : stepVariants;
  const transition = reduced ? reducedStepTransition : stepTransition;
  const itemVariants = reduced ? reducedStaggerItem : staggerItem;

  const setValue = useCallback(
    (next: AnswerValue) => {
      setAnswers((prev) => ({ ...prev, [step.id]: next }));
      setError(null);
    },
    [step.id],
  );

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const goTo = useCallback(
    (nextIndex: number, dir: Direction) => {
      if (nextIndex < 0 || nextIndex >= total) return;
      setDirection(dir);
      setError(null);
      setIndex(nextIndex);
    },
    [total],
  );

  const failValidation = useCallback((message: string) => {
    setError(message);
    setShakeKey((k) => k + 1);
  }, []);

  const submit = useCallback(async () => {
    setPhase("submitting");
    setSubmitError(null);
    try {
      const result = await submitFormAction({
        slug: form.slug,
        answers,
        idempotencyKey:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${form.slug}-${Date.now()}`,
      });
      if (!result.ok) {
        setSubmitError(result.error);
        setPhase("error");
        return;
      }
      setPhase("success");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
      setPhase("error");
    }
  }, [answers, form.slug]);

  const advance = useCallback(async () => {
    if (phase !== "playing") return;
    const result = validateStepValue(step, value);
    if (!result.ok) {
      failValidation(result.message);
      return;
    }
    if (index >= total - 1) {
      await submit();
      return;
    }
    goTo(index + 1, 1);
  }, [failValidation, goTo, index, phase, step, submit, total, value]);

  const back = useCallback(() => {
    if (phase !== "playing") return;
    if (index === 0) return;
    goTo(index - 1, -1);
  }, [goTo, index, phase]);

  const onSelectSingle = useCallback(
    async (optionValue: string, autoAdvance?: boolean) => {
      setValue(optionValue);
      if (autoAdvance) {
        // slight beat so selection highlight registers
        await new Promise((r) => setTimeout(r, reduced ? 0 : 180));
        if (index >= total - 1) {
          const nextAnswers = { ...answers, [step.id]: optionValue };
          setAnswers(nextAnswers);
          setPhase("submitting");
          try {
            const result = await submitFormAction({
              slug: form.slug,
              answers: nextAnswers,
              idempotencyKey:
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : `${form.slug}-${Date.now()}`,
            });
            if (!result.ok) {
              setSubmitError(result.error);
              setPhase("error");
              return;
            }
            setPhase("success");
          } catch {
            setSubmitError("Something went wrong. Please try again.");
            setPhase("error");
          }
          return;
        }
        goTo(index + 1, 1);
      }
    },
    [answers, form.slug, goTo, index, reduced, setValue, step.id, total],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isField =
        tag === "input" || tag === "textarea" || target?.isContentEditable;

      if (event.key === "Enter" && !event.shiftKey) {
        if (step.type === "long_text" && isField) {
          // Shift+Enter newline; plain Enter advances
        }
        event.preventDefault();
        void advance();
        return;
      }

      if (event.key === "ArrowUp" && !event.shiftKey && !event.metaKey) {
        if (isField && tag === "textarea") return;
        event.preventDefault();
        back();
        return;
      }

      if (
        isChoiceStep(step) &&
        step.type !== "multi_choice" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        const letter = event.key.toUpperCase();
        const idx = letter.charCodeAt(0) - 65;
        if (idx >= 0 && idx < step.options.length) {
          event.preventDefault();
          void onSelectSingle(
            step.options[idx].value,
            step.autoAdvance !== false,
          );
        }
      }

      if (
        isChoiceStep(step) &&
        step.type === "multi_choice" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        const letter = event.key.toUpperCase();
        const idx = letter.charCodeAt(0) - 65;
        if (idx >= 0 && idx < step.options.length) {
          event.preventDefault();
          const option = step.options[idx].value;
          const current = Array.isArray(value) ? value : [];
          const next = current.includes(option)
            ? current.filter((v) => v !== option)
            : [...current, option];
          setValue(next);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance, back, onSelectSingle, phase, setValue, step, value]);

  const contact = useMemo(() => extractContact(answers), [answers]);

  if (phase === "success") {
    return <SuccessScreen form={form} name={contact.firstName || contact.fullName} />;
  }

  return (
    <div className="form-shell relative flex min-h-dvh flex-col">
      <ProgressBar value={progress} label={`${questionNumber} → ${total}`} />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between px-5 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <div className="pointer-events-auto">
          <p className="font-display text-[1.35rem] font-medium tracking-tight text-[var(--color-text)] sm:text-2xl">
            1128
          </p>
          <p className="mt-0.5 text-xs tracking-[0.14em] text-[var(--color-muted)] uppercase">
            {form.title}
          </p>
        </div>
        <p
          className="pointer-events-none pt-2 font-sans text-xs tabular-nums text-[var(--color-muted)]"
          aria-live="polite"
        >
          {questionNumber}
          <span className="mx-1 opacity-50">→</span>
          {total}
        </p>
      </header>

      <main className="relative flex flex-1 items-center px-5 pb-28 pt-28 sm:px-8 sm:pt-32">
        <div className="mx-auto w-full max-w-xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step.id}
              role="group"
              aria-labelledby={`${formId}-title`}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              onAnimationComplete={focusInput}
              className="w-full"
            >
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-6 sm:gap-7"
              >
                <QuestionHeader
                  id={`${formId}-title`}
                  number={questionNumber}
                  title={step.title}
                  help={step.help}
                  body={step.type === "statement" ? step.body : undefined}
                  variants={itemVariants}
                />

                <motion.div variants={itemVariants}>
                  <motion.div
                    key={`shake-${shakeKey}`}
                    variants={shakeVariants}
                    animate={error ? "shake" : "idle"}
                    className={error ? "invalid-glow rounded-sm" : undefined}
                  >
                    <StepBody
                      step={step}
                      value={value}
                      inputRef={inputRef}
                      onChange={setValue}
                      onSelectSingle={onSelectSingle}
                    />
                  </motion.div>
                  {error ? (
                    <p
                      className="mt-3 text-sm text-[var(--color-danger)]"
                      role="alert"
                    >
                      {error}
                    </p>
                  ) : null}
                </motion.div>

                <motion.div variants={itemVariants}>
                  <FooterActions
                    onBack={index > 0 ? back : undefined}
                    onContinue={() => void advance()}
                    continueLabel={
                      index >= total - 1
                        ? phase === "submitting"
                          ? "Sending…"
                          : "Submit"
                        : step.type === "statement"
                          ? "Continue"
                          : "OK"
                    }
                    showEnterHint={step.type !== "multi_choice"}
                    busy={phase === "submitting"}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {phase === "error" && submitError ? (
            <div className="mt-8 rounded-md border border-[var(--color-danger)]/30 bg-white/70 p-4 text-sm text-[var(--color-danger)]">
              <p>{submitError}</p>
              <button
                type="button"
                className="mt-3 font-medium text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                onClick={() => {
                  setPhase("playing");
                  void submit();
                }}
              >
                Try again
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function StepBody({
  step,
  value,
  inputRef,
  onChange,
  onSelectSingle,
}: {
  step: Step;
  value: AnswerValue;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onChange: (value: AnswerValue) => void;
  onSelectSingle: (value: string, autoAdvance?: boolean) => void;
}) {
  if (step.type === "statement") {
    return <StatementField />;
  }

  if (isTextStep(step)) {
    return (
      <TextField
        step={step}
        value={typeof value === "string" ? value : ""}
        inputRef={inputRef}
        onChange={onChange}
      />
    );
  }

  if (isChoiceStep(step)) {
    const selected =
      step.type === "multi_choice"
        ? Array.isArray(value)
          ? value
          : []
        : typeof value === "string"
          ? value
          : "";

    return (
      <ChoiceField
        step={step}
        value={selected}
        letterForIndex={letterForIndex}
        onToggle={(optionValue) => {
          if (step.type === "multi_choice") {
            const current = Array.isArray(value) ? value : [];
            const next = current.includes(optionValue)
              ? current.filter((v) => v !== optionValue)
              : [...current, optionValue];
            onChange(next);
            return;
          }
          void onSelectSingle(optionValue, step.autoAdvance !== false);
        }}
      />
    );
  }

  return null;
}
