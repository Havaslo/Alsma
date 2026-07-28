import { useState } from "react";

import {
  formatLeadDate,
  getLeadPageLabel,
} from "@/components/admin/admin-site-leads";
import { Button } from "@/components/ui/Button";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { Modal } from "@/components/ui/Modal";
import type { SiteLead } from "@/lib/admin/admin-api";
import {
  ADMIN_STATUS_LABELS,
  ADMIN_STATUS_OPTIONS,
} from "@/lib/admin/admin-status";
import { useUpdateAdminLead } from "@/lib/admin/useAdmin";

const DataRow = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | number;
}) => (
  <div>
    <dt className="text-xs font-medium tracking-widest text-muted-ui-foreground uppercase">
      {label}
    </dt>
    <dd className="mt-2 font-medium">{value}</dd>
  </div>
);

export const AdminSiteLeadModal = ({
  lead,
  onClose,
}: {
  readonly lead: SiteLead;
  readonly onClose: () => void;
}) => {
  const update = useUpdateAdminLead();
  const [status, setStatus] = useState<SiteLead["status"]>(lead.status);
  const hasFormData =
    lead.details.checkInDate ||
    lead.details.checkOutDate ||
    lead.details.guestsCount;

  return (
    <Modal
      className="max-w-2xl"
      closeLabel="Закрыть заявку"
      onClose={onClose}
      open
      title={lead.name || "Без имени"}
    >
      <div className="space-y-4">
        <section className="rounded-2xl bg-page p-5">
          <h3 className="text-xs font-semibold tracking-widest text-muted-ui-foreground uppercase">
            Контакты
          </h3>
          <p className="mt-3 font-medium">
            {[lead.phone, lead.email].filter(Boolean).join(" · ") ||
              "Контакты не указаны"}
          </p>
        </section>

        <section className="rounded-2xl bg-page p-5">
          <h3 className="text-xs font-semibold tracking-widest text-muted-ui-foreground uppercase">
            Источник
          </h3>
          <p className="mt-3 font-semibold">
            {getLeadPageLabel(lead.sourcePage)}
          </p>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            {lead.formTitle}
          </p>
        </section>

        <section className="rounded-2xl border border-line p-5">
          <h3 className="text-xs font-semibold tracking-widest text-muted-ui-foreground uppercase">
            Данные из формы
          </h3>
          {hasFormData ? (
            <dl className="mt-4 grid gap-5 sm:grid-cols-3">
              <DataRow label="Заезд" value={lead.details.checkInDate || "—"} />
              <DataRow label="Выезд" value={lead.details.checkOutDate || "—"} />
              <DataRow label="Гостей" value={lead.details.guestsCount ?? "—"} />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-ui-foreground">
              Дополнительные параметры не указаны.
            </p>
          )}
          <div className="mt-5 border-t border-line pt-5">
            <DataRow label="Создана" value={formatLeadDate(lead.createdAt)} />
          </div>
        </section>

        <section className="rounded-2xl border border-line p-5">
          <h3 className="text-xs font-semibold tracking-widest text-muted-ui-foreground uppercase">
            Комментарий
          </h3>
          <p className="mt-3 text-sm leading-6">
            {lead.details.comment ||
              "Заявка отправлена без дополнительного комментария"}
          </p>
        </section>

        <section className="rounded-2xl bg-page p-5">
          <p className="text-xs font-semibold tracking-widest text-muted-ui-foreground uppercase">
            Текущий статус
          </p>
          <p className="mt-3 text-sm font-semibold">
            {ADMIN_STATUS_LABELS[lead.status]}
          </p>
          <div className="mt-5">
            <span className="mb-2 block text-sm font-medium">
              Изменить статус
            </span>
            <DropdownSelect<SiteLead["status"]>
              ariaLabel="Новый статус заявки"
              onChange={setStatus}
              options={ADMIN_STATUS_OPTIONS}
              triggerClassName="min-h-12 rounded-xl border border-line bg-panel px-4 text-sm"
              value={status}
            />
          </div>
          <Button
            className="mt-4 w-full"
            disabled={update.isPending || status === lead.status}
            onClick={() =>
              update.mutate({ leadId: lead.id, status }, { onSuccess: onClose })
            }
          >
            Сохранить статус
          </Button>
        </section>
      </div>
    </Modal>
  );
};
