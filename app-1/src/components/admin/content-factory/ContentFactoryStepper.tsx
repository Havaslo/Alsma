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
    className="rounded-2xl border border-line bg-brand-foreground px-3 py-3 shadow-[0_4px_18px_rgba(25,45,34,0.035)] sm:px-5 sm:py-4"
  >
    <ol className="grid grid-cols-3">
      {steps.map((step) => {
        const completed = step.number < currentStep;
        const disabled = step.number > 1 && !canOpenResults;
        const selected = step.number === currentStep;
        const hasNextStep = step.number < steps.length;

        return (
          <li className="relative min-w-0" key={step.number}>
            {hasNextStep && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-[18px] left-[calc(50%+18px)] z-0 h-px w-[calc(100%-36px)]",
                  completed ? "bg-brand/40" : "bg-line",
                )}
              />
            )}
            <button
              aria-current={selected ? "step" : undefined}
              className={cn(
                "relative z-10 flex min-h-[76px] w-full flex-col items-center justify-start gap-2 rounded-xl px-1 py-1 text-center transition sm:min-h-[82px] sm:gap-2.5",
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
                  "max-w-full truncate text-xs font-semibold sm:text-sm",
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
