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
    className="relative rounded-2xl border border-line bg-brand-foreground px-3 py-3 shadow-[0_4px_18px_rgba(25,45,34,0.035)] sm:px-5 sm:py-4"
  >
    <span
      aria-hidden="true"
      className="absolute top-10 right-[16.66%] left-[16.66%] hidden h-px bg-line sm:block"
    />
    <ol className="relative grid gap-1 sm:grid-cols-3 sm:gap-0">
      {steps.map((step) => {
        const completed = step.number < currentStep;
        const disabled = step.number > 1 && !canOpenResults;
        const selected = step.number === currentStep;
        return (
          <li key={step.number}>
            <button
              aria-current={selected ? "step" : undefined}
              className={cn(
                "group relative z-10 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition sm:justify-center sm:gap-2.5 sm:px-2",
                selected
                  ? "bg-brand/[0.06] text-brand sm:bg-transparent"
                  : "text-muted-ui-foreground hover:bg-page sm:hover:bg-transparent",
                disabled &&
                  "cursor-not-allowed opacity-45 hover:bg-transparent",
              )}
              disabled={disabled}
              onClick={() => onStepChange(step.number)}
              type="button"
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full border-2 bg-brand-foreground text-xs font-bold transition",
                  completed && "border-brand bg-brand text-white",
                  selected &&
                    "border-brand bg-brand text-white shadow-[0_0_0_4px_rgba(24,91,68,0.09)]",
                  !selected &&
                    !completed &&
                    "border-line text-muted-ui-foreground",
                )}
              >
                {completed ? (
                  <Check className="size-4" strokeWidth={2.5} />
                ) : (
                  step.number
                )}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    disabled && "text-muted-ui-foreground/70",
                  )}
                >
                  {step.label}
                </span>
                <span className="mt-0.5 hidden text-[11px] text-muted-ui-foreground sm:block">
                  {completed ? "Готово" : selected ? "Текущий шаг" : "Далее"}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  </nav>
);
