import { Pencil, Trash2 } from "lucide-react";

import type { ServiceSection } from "@/lib/services/admin-services-api";

type ServiceItem = ServiceSection["services"][number];

type Props = {
  selected: ServiceSection;
  statusOverrides: Record<string, "draft" | "published" | "archived">;
  statusError: string;
  onTogglePublication: (item: ServiceItem) => void;
  onEdit: (item: ServiceItem) => void;
  onDelete: (item: ServiceItem) => void;
};

export const AdminServicesTable = ({
  selected,
  statusOverrides,
  statusError,
  onTogglePublication,
  onEdit,
  onDelete,
}: Props) => (
  <div className="mt-5 overflow-x-auto">
    <table className="w-full min-w-[820px] text-left text-sm">
      <thead className="border-b border-line text-muted-ui-foreground">
        <tr>
          <th className="px-3 py-3">Название</th>
          <th className="px-3 py-3">Тип</th>
          <th className="px-3 py-3">Варианты / цена</th>
          <th className="px-3 py-3">Длительность</th>
          <th className="px-3 py-3">Места / остаток</th>
          <th className="px-3 py-3">Публикация</th>
          <th className="px-3 py-3">Действия</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {selected.services.map((item) => {
          const status = statusOverrides[item.id] ?? item.status;
          const published = status === "published";
          return (
            <tr key={item.id}>
              <td className="px-3 py-4 font-semibold text-brand">
                {item.name}
                <div className="font-normal text-muted-ui-foreground">
                  {item.description}
                </div>
              </td>
              <td className="px-3 py-4">
                {item.variants[0]?.name === "Товар" ? "Товар" : "Услуга"}
              </td>
              <td className="px-3 py-4">
                {item.variants.map((variant) => (
                  <div key={variant.id}>
                    {variant.name}: {variant.price} ₽
                  </div>
                ))}
              </td>
              <td className="px-3 py-4">
                {item.variants.map((variant) => (
                  <div key={variant.id}>
                    {variant.durationMin ? `${variant.durationMin} мин` : "—"}
                  </div>
                ))}
              </td>
              <td className="px-3 py-4">
                {item.variants.map((variant) => (
                  <div key={variant.id}>{variant.capacity}</div>
                ))}
              </td>
              <td className="px-3 py-4">
                <button
                  aria-checked={published}
                  aria-label={`${published ? "Снять с публикации" : "Опубликовать"} карточку «${item.name}»`}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition ${published ? "bg-brand" : "bg-line"}`}
                  onClick={() => onTogglePublication(item)}
                  role="switch"
                  title={published ? "Опубликовано" : "Черновик"}
                  type="button"
                >
                  <span
                    className={`size-4 rounded-full bg-brand-foreground shadow-sm transition-transform ${published ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
                <span className="sr-only">
                  {published
                    ? "Опубликовано"
                    : status === "archived"
                      ? "В архиве"
                      : "Черновик"}
                </span>
              </td>
              <td className="space-x-2 px-3 py-4 whitespace-nowrap">
                <button
                  aria-label={`Редактировать карточку «${item.name}»`}
                  className="inline-grid size-9 place-items-center rounded-full border border-line text-brand transition hover:border-brand"
                  onClick={() => onEdit(item)}
                  title="Редактировать"
                  type="button"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  aria-label={`Удалить карточку «${item.name}»`}
                  className="inline-grid size-9 place-items-center rounded-full border border-line text-red-700 transition hover:border-red-300"
                  onClick={() => onDelete(item)}
                  title="Удалить"
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    {statusError && (
      <p
        className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        role="alert"
      >
        {statusError}
      </p>
    )}
    {!selected.services.length && (
      <p className="p-6 text-muted-ui-foreground">
        В этом разделе пока нет карточек.
      </p>
    )}
  </div>
);
