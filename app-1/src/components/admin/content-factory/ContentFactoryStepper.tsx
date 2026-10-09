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
    className="rounded-xl border border-line bg-brand-foreground px-2 py-1.5 shadow-[0_4px_18px_rgba(25,45,34,0.035)] sm:px-3"
  >
    <ol className="grid grid-cols-3">
      {steps.map((step) => {
        const completed = step.number < currentStep;
        const disabled = step.number > 1 && !canOpenResults;
        const selected = step.number === currentStep;

        return (
          <li className="relative min-w-0" key={step.number}>
            <button
              aria-current={selected ? "step" : undefined}
              className={cn(
                "relative z-10 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg px-1.5 py-1 text-center transition sm:gap-2 sm:px-2",
                selected && "bg-brand/[0.045]",
                !selected &&
                  !disabled &&
                  "hover:bg-page/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                disabled && "cursor-not-allowed opacity-45",
              )}
              disabled={disabled}
              onClick={() => onStepChange(step.number)}
              type="button"
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border-2 bg-brand-foreground text-[10px] font-bold transition sm:size-7 sm:text-xs",
                  completed && "border-brand bg-brand text-white",
                  selected &&
                    "border-brand bg-brand text-white shadow-[0_0_0_3px_rgba(24,91,68,0.09)]",
                  !selected &&
                    !completed &&
                    "border-line text-muted-ui-foreground",
                )}
              >
                {completed ? (
                  <Check
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={2.5}
                  />
                ) : (
                  step.number
                )}
              </span>
              <span
                className={cn(
                  "min-w-0 truncate text-[10px] leading-tight font-semibold sm:text-xs",
                  selected || completed
                    ? "text-brand"
                    : "text-muted-ui-foreground",
                )}
              >
                {step.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  </nav>
);
