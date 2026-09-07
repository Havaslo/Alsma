import type { FormEvent } from "react";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { MediaUploadField } from "@/components/ui/MediaUploadField";
import { Modal } from "@/components/ui/Modal";

type Variant = {
  id?: string;
  name: string;
  price: string;
  capacity: string;
  durationMin: string;
  resources?: Array<{ resourceId: string; quantity: number }>;
};
type Resource = { id: string; name: string; totalUnits: number };
export type ServiceCardDraft = {
  name: string;
  description: string;
  kind: "service" | "product";
  status: "draft" | "published" | "archived";
  imageUrl: string;
};

type Props = {
  open: boolean;
  cardId?: string;
  card: ServiceCardDraft;
  variants: Variant[];
  error: string;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onCardChange: (card: ServiceCardDraft) => void;
  onVariantChange: (index: number, patch: Partial<Variant>) => void;
  onRemoveVariant: (index: number) => void;
  onAddVariant: () => void;
  resources?: Resource[];
};

export const AdminServiceCardModal = ({
  open,
  cardId,
  card,
  variants,
  error,
  onClose,
  onSubmit,
  onCardChange,
  onVariantChange,
  onRemoveVariant,
  onAddVariant,
  resources = [],
}: Props) => (
  <Modal
    className="max-w-5xl"
    onClose={onClose}
    open={open}
    title={cardId ? "Редактировать карточку" : "Создать карточку"}
  >
    <form className="space-y-4 p-6" onSubmit={onSubmit}>
      {error && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      <label className="block text-sm font-semibold text-brand">
        Название карточки
        <input
          className="mt-2 w-full rounded-xl border p-3"
          placeholder="Например, Массаж"
          required
          value={card.name}
          onChange={(event) =>
            onCardChange({ ...card, name: event.target.value })
          }
        />
      </label>
      <MediaUploadField
        currentUrl={card.imageUrl}
        label="Загрузить изображение"
        onUploaded={(asset) => onCardChange({ ...card, imageUrl: asset.url })}
      />
      <label className="block text-sm font-semibold text-brand">
        Тип карточки
        <select
          className="mt-2 w-full rounded-xl border p-3"
          value={card.kind}
          onChange={(event) =>
            onCardChange({
              ...card,
              kind: event.target.value as ServiceCardDraft["kind"],
            })
          }
        >
          <option value="service">Услуга</option>
          <option value="product">Товар</option>
        </select>
      </label>
      <label className="block text-sm font-semibold text-brand">
        Описание карточки
        <textarea
          className="mt-2 min-h-24 w-full rounded-xl border p-3 font-normal"
          placeholder="Короткое описание"
          value={card.description}
          onChange={(event) =>
            onCardChange({ ...card, description: event.target.value })
          }
        />
      </label>
      <div className="grid gap-3 text-sm font-semibold text-brand md:grid-cols-4">
        <span>{card.kind === "product" ? "Цена, ₽" : "Тип услуги"}</span>
        {card.kind === "service" && <span>Цена, ₽</span>}
        {card.kind === "service" && <span>Длительность, мин</span>}
        <span>{card.kind === "product" ? "Остаток" : "Количество мест"}</span>
      </div>
      {variants.map((entry, index) => (
        <div
          className="grid items-end gap-3 md:grid-cols-[minmax(14rem,1.5fr)_minmax(7rem,1fr)_minmax(10rem,1fr)_minmax(9rem,1fr)_2.5rem]"
          key={entry.id ?? index}
        >
          <input
            className="rounded-xl border p-3"
            placeholder={card.kind === "product" ? "Цена" : "Тип услуги"}
            required
            value={card.kind === "product" ? entry.price : entry.name}
            onChange={(event) =>
              onVariantChange(
                index,
                card.kind === "product"
                  ? { price: event.target.value }
                  : { name: event.target.value },
              )
            }
          />
          {card.kind === "service" && (
            <>
              <input
                className="rounded-xl border p-3"
                placeholder="Цена"
                required
                type="number"
                value={entry.price}
                onChange={(event) =>
                  onVariantChange(index, { price: event.target.value })
                }
              />
              <input
                className="rounded-xl border p-3"
                placeholder="Минуты"
                required
                type="number"
                value={entry.durationMin}
                onChange={(event) =>
                  onVariantChange(index, { durationMin: event.target.value })
                }
              />
            </>
          )}
          <input
            className="rounded-xl border p-3"
            placeholder={card.kind === "product" ? "Остаток" : "Мест"}
            required
            type="number"
            min={card.kind === "product" ? 0 : 1}
            value={entry.capacity}
            disabled={
              card.kind === "service" && (entry.resources?.length ?? 0) > 0
            }
            aria-describedby={
              card.kind === "service" && (entry.resources?.length ?? 0) > 0
                ? `capacity-help-${index}`
                : undefined
            }
            onChange={(event) =>
              onVariantChange(index, { capacity: event.target.value })
            }
          />
          {card.kind === "service" && (entry.resources?.length ?? 0) > 0 && (
            <p
              className="text-muted-foreground text-xs font-normal md:col-span-4"
              id={`capacity-help-${index}`}
            >
              Вместимость определяется выбранными ресурсами и не используется
              для доступности.
            </p>
          )}
          {card.kind === "service" && (
            <div className="rounded-xl bg-muted-ui/20 p-3 text-sm md:col-span-5">
              <p className="font-semibold">Ресурсы на одну запись</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {resources.map((resource) => {
                  const assignment = (entry.resources ?? []).find(
                    (item) => item.resourceId === resource.id,
                  );
                  const checkboxId = `resource-${index}-${resource.id}`;
                  return (
                    <div className="flex items-center gap-2" key={resource.id}>
                      <input
                        aria-label={`Использовать ресурс ${resource.name}`}
                        id={checkboxId}
                        type="checkbox"
                        checked={Boolean(assignment)}
                        onChange={(event) => {
                          const current = (entry.resources ?? []).filter(
                            (item) => item.resourceId !== resource.id,
                          );
                          onVariantChange(index, {
                            resources: event.target.checked
                              ? [
                                  ...current,
                                  { resourceId: resource.id, quantity: 1 },
                                ]
                              : current,
                          });
                        }}
                      />
                      <label className="cursor-pointer" htmlFor={checkboxId}>
                        {resource.name} (всего {resource.totalUnits})
                      </label>
                      {assignment && (
                        <>
                          <input
                            className="w-20 rounded border p-1"
                            min="1"
                            max={resource.totalUnits}
                            type="number"
                            value={assignment.quantity}
                            aria-label={`Количество ресурса ${resource.name}`}
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onChange={(event) => {
                              const requested = Number(event.target.value);
                              const quantity = Number.isFinite(requested)
                                ? Math.min(
                                    resource.totalUnits,
                                    Math.max(1, Math.trunc(requested)),
                                  )
                                : 1;
                              onVariantChange(index, {
                                resources: (entry.resources ?? []).map(
                                  (item) =>
                                    item.resourceId === resource.id
                                      ? { ...item, quantity }
                                      : item,
                                ),
                              });
                            }}
                          />
                          <span className="text-muted-foreground text-xs">
                            максимум {resource.totalUnits}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {card.kind === "service" && (
            <button
              aria-label="Удалить тип услуги"
              className="grid size-10 place-items-center rounded-full border border-line text-brand transition hover:border-red-300 hover:text-red-700"
              disabled={variants.length === 1}
              onClick={() => onRemoveVariant(index)}
              title="Удалить тип услуги"
              type="button"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {card.kind === "service" && (
          <button
            className="rounded-full border border-brand px-4 py-2 text-brand"
            onClick={onAddVariant}
            type="button"
          >
            + Добавить тип услуги
          </button>
        )}
        <Button className="ml-auto" type="submit">
          Сохранить карточку
        </Button>
      </div>
    </form>
  </Modal>
);
