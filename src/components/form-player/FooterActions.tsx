"use client";

export function FooterActions({
  onBack,
  onContinue,
  continueLabel,
  showEnterHint,
  busy,
}: {
  onBack?: () => void;
  onContinue: () => void;
  continueLabel: string;
  showEnterHint?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-1">
      <button
        type="button"
        onClick={onContinue}
        disabled={busy}
        className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 px-5 text-[0.95rem] font-medium tracking-wide disabled:opacity-60"
      >
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            {continueLabel}
          </span>
        ) : (
          continueLabel
        )}
      </button>

      {showEnterHint && !busy ? (
        <p className="text-sm text-[var(--color-muted)]">
          press <kbd className="kbd">Enter ↵</kbd>
        </p>
      ) : null}

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="ml-auto text-sm text-[var(--color-muted)] underline-offset-4 hover:text-[var(--color-text)] hover:underline"
        >
          Back
        </button>
      ) : null}
    </div>
  );
}
