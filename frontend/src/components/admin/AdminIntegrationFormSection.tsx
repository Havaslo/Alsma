import { CheckboxField, TextField } from "@/components/ui/FormField";
import {
  INTEGRATION_STATUS_LABELS,
  type MockIntegrationSection,
} from "@/lib/admin/admin-integration-mocks";
import { cn } from "@/lib/cn";

const STATUS_TONES = {
  "approval-required": "bg-muted-ui text-muted-ui-foreground",
  "awaiting-data": "bg-supporting/25 text-accent-ui-foreground",
  "not-connected": "bg-supporting/25 text-accent-ui-foreground",
} as const;

export const AdminIntegrationFormSection = ({
  checkboxValues,
  fieldValues,
  onCheckboxChange,
  onFieldChange,
  section,
}: {
  readonly checkboxValues: Readonly<Record<string, boolean>>;
  readonly fieldValues: Readonly<Record<string, string>>;
  readonly onCheckboxChange: (id: string, checked: boolean) => void;
  readonly onFieldChange: (id: string, value: string) => void;
  readonly section: MockIntegrationSection;
}) => (
  <article className="rounded-3xl border border-line bg-brand-foreground p-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-brand">{section.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
          {section.description}
        </p>
      </div>
      <span
        className={cn(
          "rounded-full px-3 py-1 text-xs font-semibold",
          STATUS_TONES[section.status],
        )}
      >
        {INTEGRATION_STATUS_LABELS[section.status]}
      </span>
    </header>

    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {section.fields.map((field) => (
        <TextField
          key={field.id}
          label={field.label}
          onChange={(event) => onFieldChange(field.id, event.target.value)}
          placeholder="..."
          value={fieldValues[field.id] ?? ""}
        />
      ))}
    </div>

    {section.checkboxes && (
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {section.checkboxes.map((checkbox) => (
          <CheckboxField
            checked={checkboxValues[checkbox.id] ?? checkbox.checked}
            className="w-full"
            key={checkbox.id}
            label={checkbox.label}
            onChange={(checked) => onCheckboxChange(checkbox.id, checked)}
          />
        ))}
      </div>
    )}

    {section.footer && (
      <div className="mt-6 rounded-2xl border border-line bg-page p-4 text-sm leading-6 text-muted-ui-foreground">
        {section.footer}
      </div>
    )}
  </article>
);
