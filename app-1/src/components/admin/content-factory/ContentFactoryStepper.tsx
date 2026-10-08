import { Check } from "lucide-react";

import { cn } from "@/lib/cn";

const steps = [
  { number: 1, label: "Задача" },
  { number: 2, label: "Результат" },
  { number: 3, label: "Версии для каналов" },
] as const;

export const ContentFactoryStepper = ({
  currentStep,
  canOpenResults,
  onStepChange,
}: {
  currentStep: 1 | 2 | 3;
  canOpenResults: boolean;
  onStepChange: (step: 1 | 2 | 3) => void;
}) => (
  <nav
    aria-label="Шаги создания публикации"
    className="rounded-2xl border border-line bg-brand-foreground p-2 sm:p-3"
  >
    <ol className="grid gap-2 sm:grid-cols-3">
      {steps.map((step) => {
        const completed = step.number < currentStep;
        const disabled = step.number > 1 && !canOpenResults;
        const selected = step.number === currentStep;
        return (
          <li key={step.number}>
            <button
              aria-current={selected ? "step" : undefined}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition",
                selected
                  ? "bg-brand/8 text-brand"
                  : "text-muted-ui-foreground hover:bg-page",
                disabled &&
                  "cursor-not-allowed opacity-45 hover:bg-transparent",
              )}
              disabled={disabled}
              onClick={() => onStepChange(step.number)}
              type="button"
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold",
                  selected || completed
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-brand-foreground",
                )}
              >
                {completed ? <Check className="size-3.5" /> : step.number}
              </span>
              <span className="text-sm font-semibold">{step.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  </nav>
);
