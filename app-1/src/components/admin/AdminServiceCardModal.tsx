import type { FormEvent } from "react";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type Variant = {
  id?: string;
  name: string;
  price: string;
  capacity: string;
  durationMin: string;
};
type Card = { name: string; description: string; kind: "service" | "product" };

type Props = {
  open: boolean;
  cardId?: string;
  card: Card;
  variants: Variant[];
  error: string;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onCardChange: (card: Card) => void;
  onVariantChange: (index: number, patch: Partial<Variant>) => void;
  onRemoveVariant: (index: number) => void;
  onAddVariant: () => void;
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
      <label className="block text-sm font-semibold text-brand">
        Тип карточки
        <select
          className="mt-2 w-full rounded-xl border p-3"
          value={card.kind}
          onChange={(event) =>
            onCardChange({ ...card, kind: event.target.value as Card["kind"] })
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
            onChange={(event) =>
              onVariantChange(index, { capacity: event.target.value })
            }
          />
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
