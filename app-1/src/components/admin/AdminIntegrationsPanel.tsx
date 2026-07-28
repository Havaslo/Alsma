import { useState } from "react";

import { AdminIntegrationFormSection } from "@/components/admin/AdminIntegrationFormSection";
import {
  INTEGRATION_STATUS_LABELS,
  MOCK_INTEGRATION_FLOW,
  MOCK_INTEGRATION_OVERVIEW,
  MOCK_INTEGRATION_REQUIREMENTS,
  MOCK_INTEGRATION_SECTIONS,
} from "@/lib/admin/admin-integration-mocks";
import { cn } from "@/lib/cn";

const STATUS_TONES = {
  "approval-required": "bg-muted-ui text-muted-ui-foreground",
  "awaiting-data": "bg-supporting/25 text-accent-ui-foreground",
  "not-connected": "bg-supporting/25 text-accent-ui-foreground",
} as const;

const initialCheckboxValues = Object.fromEntries(
  MOCK_INTEGRATION_SECTIONS.flatMap(
    (section) =>
      section.checkboxes?.map((checkbox) => [checkbox.id, checkbox.checked]) ??
      [],
  ),
);

export const AdminIntegrationsPanel = () => {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [checkboxValues, setCheckboxValues] = useState<Record<string, boolean>>(
    () => initialCheckboxValues,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <h1 className="text-3xl font-semibold">Интеграции</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-ui-foreground">
          Здесь можно подготовить подключение PMS Eptera, каналов MAX и
          ВКонтакте, а также телефонии для чат- и голосовых AI-агентов.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {MOCK_INTEGRATION_OVERVIEW.map(({ description, status, title }) => (
          <article
            className="rounded-3xl border border-line bg-brand-foreground p-5"
            key={title}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-brand">{title}</h2>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  STATUS_TONES[status],
                )}
              >
                {INTEGRATION_STATUS_LABELS[status]}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-ui-foreground">
              {description}
            </p>
          </article>
        ))}
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]">
        <div className="space-y-6">
          {MOCK_INTEGRATION_SECTIONS.map((section) => (
            <AdminIntegrationFormSection
              checkboxValues={checkboxValues}
              fieldValues={fieldValues}
              key={section.id}
              onCheckboxChange={(id, checked) =>
                setCheckboxValues((current) => ({
                  ...current,
                  [id]: checked,
                }))
              }
              onFieldChange={(id, value) =>
                setFieldValues((current) => ({ ...current, [id]: value }))
              }
              section={section}
            />
          ))}
        </div>

        <aside className="space-y-6">
          <article className="rounded-3xl border border-line bg-brand-foreground p-6">
            <h2 className="text-lg font-semibold text-brand">
              Как это будет работать
            </h2>
            <div className="mt-5 space-y-4">
              {MOCK_INTEGRATION_FLOW.map((step, index) => (
                <div
                  className="flex gap-4 rounded-2xl border border-line bg-page p-4"
                  key={step}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-muted-ui-foreground">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-line bg-brand-foreground p-6">
            <h2 className="text-lg font-semibold text-brand">
              Что понадобится от вас
            </h2>
            <div className="mt-5 space-y-3">
              {MOCK_INTEGRATION_REQUIREMENTS.map((item) => (
                <div
                  className="rounded-2xl border border-line bg-page p-4 text-sm leading-6 text-muted-ui-foreground"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
};
