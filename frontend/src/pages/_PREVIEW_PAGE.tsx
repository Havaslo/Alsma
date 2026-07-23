import { Sparkles } from "lucide-react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

import { PageLayout } from "@/components/PageLayout";
import { ThemeToggle } from "@/lib/theme/ThemeToggle";

export const PreviewPage = () => {
  const reduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <PageLayout
        contentClassName="relative grid place-items-center overflow-hidden"
        header={
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-brand font-heading font-bold text-brand-foreground shadow-sm shadow-brand/20">
                A
              </span>
              <span className="font-heading font-semibold">Amazi</span>
            </div>
            <ThemeToggle />
          </div>
        }
      >
        <m.div
          animate={
            reduceMotion
              ? undefined
              : { scale: [1, 1.12, 1], x: [0, 48, 0], y: [0, 24, 0] }
          }
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/4 size-80 rounded-full bg-brand/15 blur-3xl"
          transition={{ duration: 14, ease: "easeInOut", repeat: Infinity }}
        />
        <m.div
          animate={
            reduceMotion
              ? undefined
              : { scale: [1, 1.18, 1], x: [0, -40, 0], y: [0, -28, 0] }
          }
          aria-hidden="true"
          className="pointer-events-none absolute right-1/4 -bottom-32 size-96 rounded-full bg-accent-ui/15 blur-3xl"
          transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
        />
        <m.section
          animate={{ scale: 1, y: 0 }}
          className="relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-line/60 bg-panel/75 p-2 text-panel-foreground shadow-2xl shadow-page-foreground/10 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]"
          initial={reduceMotion ? false : { scale: 0.98, y: 24 }}
          transition={{
            duration: reduceMotion ? 0 : 0.7,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <div className="relative z-10 flex flex-col justify-center gap-8 px-6 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-20">
            <span className="w-fit rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-xs font-semibold tracking-widest text-brand uppercase">
              A new beginning
            </span>
            <div className="grid gap-5">
              <h1 className="max-w-2xl font-heading text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
                Build what comes{" "}
                <span className="bg-gradient-to-r from-brand via-accent-ui to-brand bg-clip-text text-transparent">
                  next.
                </span>
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-ui-foreground sm:text-lg">
                A place for bold ideas to become beautiful, useful experiences.
              </p>
            </div>
            <div
              aria-label="Creative process"
              className="flex flex-wrap justify-start gap-2"
            >
              {[
                ["01", "Imagine"],
                ["02", "Shape"],
                ["03", "Build"],
                ["04", "Share"],
              ].map(([step, label]) => (
                <span
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line/60 bg-page/40 px-2 text-left text-xs leading-none sm:gap-2 sm:px-3 sm:text-sm"
                  key={step}
                >
                  <span className="font-code text-xs leading-none text-brand">
                    {step}
                  </span>
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative min-h-96 overflow-hidden border-t border-line/60 bg-muted-ui/20 lg:min-h-full lg:border-t-0 lg:border-l">
            <m.div
              animate={
                reduceMotion ? undefined : { opacity: [0.35, 0.7, 0.35] }
              }
              aria-hidden="true"
              className="absolute top-10 right-10 size-2 rounded-full bg-brand shadow-md shadow-brand/30"
              transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
            />
            <span className="absolute top-7 right-16 text-xs font-medium tracking-wide text-muted-ui-foreground uppercase">
              Ideas in motion
            </span>
            <span
              aria-hidden="true"
              className="absolute top-1/4 left-10 size-1.5 rounded-full bg-accent-ui/70"
            />
            <span
              aria-hidden="true"
              className="absolute right-14 bottom-1/3 size-1 rounded-full bg-brand/70"
            />
            <span
              aria-hidden="true"
              className="absolute bottom-10 left-10 font-code text-xs text-muted-ui-foreground"
            >
              • • •
            </span>
            <div
              aria-hidden="true"
              className="absolute inset-1/2 size-64 -translate-1/2 rounded-full bg-brand/10 blur-3xl"
            />
            <div className="absolute inset-0 grid place-items-center">
              <m.div
                animate={reduceMotion ? undefined : { rotate: 360 }}
                aria-hidden="true"
                className="relative size-72 rounded-full border border-dashed border-brand/35 sm:size-80"
                transition={{ duration: 24, ease: "linear", repeat: Infinity }}
              >
                <span className="absolute top-1/2 -right-1.5 size-3 -translate-y-1/2 rounded-full bg-accent-ui shadow-md shadow-accent-ui/30" />
                <span className="absolute -bottom-1 left-1/3 size-2 rounded-full bg-brand" />
              </m.div>
            </div>
            <div className="absolute inset-0 grid place-items-center">
              <m.div
                animate={reduceMotion ? undefined : { rotate: -360 }}
                aria-hidden="true"
                className="relative size-52 rounded-full border border-line/70 sm:size-60"
                transition={{ duration: 18, ease: "linear", repeat: Infinity }}
              >
                <span className="absolute top-6 left-3 size-2.5 rounded-full bg-brand/70" />
              </m.div>
            </div>
            <div className="absolute inset-0 grid place-items-center">
              <m.div
                animate={
                  reduceMotion
                    ? undefined
                    : { rotate: [0, -4, 4, 0], scale: [1, 1.04, 1] }
                }
                className="grid size-28 place-items-center rounded-3xl bg-gradient-to-br from-brand to-accent-ui text-brand-foreground shadow-2xl shadow-brand/25"
                transition={{
                  duration: 6,
                  ease: "easeInOut",
                  repeat: Infinity,
                }}
              >
                <Sparkles className="size-10" />
              </m.div>
            </div>
            <m.div
              animate={reduceMotion ? undefined : { y: [-6, 6, -6] }}
              className="absolute top-6 left-5 rounded-2xl border border-line/60 bg-panel/80 px-4 py-3 shadow-lg shadow-page-foreground/5 backdrop-blur-xl sm:top-10 sm:left-8"
              transition={{ duration: 5, ease: "easeInOut", repeat: Infinity }}
            >
              <p className="text-xs text-muted-ui-foreground">Possibility</p>
              <p className="font-heading font-semibold">Unlimited</p>
            </m.div>
            <m.div
              animate={reduceMotion ? undefined : { y: [7, -7, 7] }}
              className="absolute right-5 bottom-6 rounded-2xl border border-line/60 bg-panel/80 px-4 py-3 shadow-lg shadow-page-foreground/5 backdrop-blur-xl sm:right-8 sm:bottom-10"
              transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
            >
              <p className="text-xs text-muted-ui-foreground">Direction</p>
              <p className="font-heading font-semibold">Forward</p>
            </m.div>
          </div>
        </m.section>
      </PageLayout>
    </LazyMotion>
  );
};
