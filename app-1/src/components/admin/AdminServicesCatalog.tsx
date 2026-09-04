import { type FormEvent, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import {
  createService,
  createServiceSection,
  createVariant,
  deleteService,
  deleteVariant,
  loadServiceSections,
  updateService,
  updateServiceSection,
  updateVariant,
} from "@/lib/services/admin-services-api";

const pages = [
  ["home", "Главная"],
  ["rooms", "Проживание"],
  ["spa", "SPA"],
  ["entertainment", "Развлечения"],
  ["all-inclusive", "Всё включено"],
  ["offers", "Акции"],
  ["celebrations", "Торжества"],
  ["hardware-procedures", "Аппаратные процедуры"],
] as const;
type Variant = {
  id?: string;
  name: string;
  price: string;
  capacity: string;
  durationMin: string;
};
const blankVariant = (): Variant => ({
  name: "",
  price: "",
  capacity: "",
  durationMin: "",
});
const blankSection = () => ({
  name: "",
  pageSlug: "",
  heading: "",
  subheading: "",
  blockNumber: "1",
});

export const AdminServicesCatalog = () => {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["service-sections"],
    queryFn: loadServiceSections,
  });
  const [sectionId, setSectionId] = useState("");
  const [section, setSection] = useState(blankSection());
  const [sectionOpen, setSectionOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardId, setCardId] = useState<string>();
  const [card, setCard] = useState({
    name: "",
    description: "",
    kind: "service" as "service" | "product",
  });
  const [variants, setVariants] = useState<Variant[]>([blankVariant()]);
  const [originalVariantIds, setOriginalVariantIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  }>();
  const [cardError, setCardError] = useState("");
  const refresh = () =>
    void client.invalidateQueries({ queryKey: ["service-sections"] });
  const selectSection = (id: string) => {
    const item = query.data?.data.sections.find((entry) => entry.id === id);
    if (!item) return;
    setSectionId(id);
    setSection({
      name: item.name,
      pageSlug: item.pageSlug,
      heading: item.heading,
      subheading: item.subheading ?? "",
      blockNumber: String(item.blockNumber),
    });
  };
  const saveSection = async (event: FormEvent) => {
    event.preventDefault();
    const input = {
      ...section,
      subheading: section.subheading || undefined,
      blockNumber: Number(section.blockNumber),
    };
    const result = sectionId
      ? await updateServiceSection(sectionId, {
          ...input,
          subheading: input.subheading ?? null,
        })
      : await createServiceSection(input);
    setSectionId(result.data.section.id);
    setSectionOpen(false);
    refresh();
  };
  const openNewCard = () => {
    setCardId(undefined);
    setCard({ name: "", description: "", kind: "service" });
    setVariants([blankVariant()]);
    setOriginalVariantIds([]);
    setCardError("");
    setCardOpen(true);
  };
  const openEditCard = (
    item: NonNullable<
      typeof query.data
    >["data"]["sections"][number]["services"][number],
  ) => {
    setCardId(item.id);
    setCard({
      name: item.name,
      description: item.description ?? "",
      kind: item.variants[0]?.name === "Товар" ? "product" : "service",
    });
    const loadedVariants = item.variants.map((entry) => ({
      id: entry.id,
      name: entry.name,
      price: entry.price,
      capacity: String(entry.capacity),
      durationMin: entry.durationMin ? String(entry.durationMin) : "",
    }));
    setVariants(loadedVariants);
    setOriginalVariantIds(item.variants.map((entry) => entry.id));
    setCardError("");
    setCardOpen(true);
  };
  const saveCard = async (event: FormEvent) => {
    event.preventDefault();
    if (!sectionId) return;
    const entries =
      card.kind === "product"
        ? [{ ...variants[0], name: "Товар", durationMin: "" }]
        : variants;
    try {
      let serviceId = cardId;
      if (serviceId)
        await updateService(serviceId, {
          slug: `${section.pageSlug}-${serviceId}`,
          name: card.name,
          description: card.description,
          status:
            selected?.services.find((item) => item.id === serviceId)?.status ??
            "draft",
          sectionId,
        });
      else {
        const result = await createService({
          slug: `${section.pageSlug}-${card.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9а-яё]+/gi, "-")}`,
          name: card.name,
          description: card.description,
          sectionId,
        });
        serviceId = (result.data as { service: { id: string } }).service.id;
      }
      const retainedIds = new Set(
        entries.flatMap((entry) => (entry.id ? [entry.id] : [])),
      );
      if (cardId) {
        const removed = originalVariantIds.filter(
          (variantId) => !retainedIds.has(variantId),
        );
        await Promise.all(
          removed.map((variantId) => deleteVariant(serviceId!, variantId)),
        );
      }
      await Promise.all(
        entries.map((entry) =>
          entry.id
            ? updateVariant(serviceId!, entry.id, {
                name: entry.name,
                price: Number(entry.price),
                capacity: Number(entry.capacity),
                durationMin: entry.durationMin
                  ? Number(entry.durationMin)
                  : null,
                active: true,
              })
            : createVariant(serviceId!, {
                name: entry.name,
                price: Number(entry.price),
                capacity: Number(entry.capacity),
                durationMin: entry.durationMin
                  ? Number(entry.durationMin)
                  : null,
              }),
        ),
      );
      setCardOpen(false);
      refresh();
    } catch (error) {
      const message = axios.isAxiosError<{ error?: { message?: string } }>(
        error,
      )
        ? error.response?.data?.error?.message
        : undefined;
      setCardError(
        message ??
          "Не удалось сохранить карточку. Проверьте данные и попробуйте ещё раз.",
      );
    }
  };
  const updateVariantDraft = (index: number, patch: Partial<Variant>) =>
    setVariants((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  const selected = query.data?.data.sections.find(
    (item) => item.id === sectionId,
  );
  const removeCard = async () => {
    if (!deleteTarget) return;
    await deleteService(deleteTarget.id);
    setDeleteTarget(undefined);
    refresh();
  };
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm tracking-[0.18em] text-brand uppercase">
              Разделы каталога
            </p>
            <h2 className="mt-1 font-heading text-3xl font-semibold text-brand">
              Группы карточек
            </h2>
          </div>
          <Button
            onClick={() => {
              setSectionId("");
              setSection(blankSection());
              setSectionOpen(true);
            }}
            type="button"
          >
            + Новый раздел
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {query.data?.data.sections.map((item) => (
            <button
              className={`rounded-full border px-4 py-2 text-sm ${item.id === sectionId ? "border-brand bg-brand text-brand-foreground" : "border-line text-brand"}`}
              key={item.id}
              onClick={() => selectSection(item.id)}
              type="button"
            >
              {item.name}
            </button>
          ))}
        </div>
        {sectionId && (
          <form
            className="mt-6 grid gap-3 rounded-2xl bg-page p-4 md:grid-cols-2"
            onSubmit={saveSection}
          >
            <p className="text-xs tracking-[0.18em] text-brand uppercase md:col-span-2">
              Управление блоком
            </p>
            <input
              className="rounded-xl border p-3"
              placeholder="Заголовок"
              required
              value={section.heading}
              onChange={(event) =>
                setSection({ ...section, heading: event.target.value })
              }
            />
            <input
              className="rounded-xl border p-3"
              placeholder="Описание / подзаголовок"
              value={section.subheading}
              onChange={(event) =>
                setSection({ ...section, subheading: event.target.value })
              }
            />
            <select
              className="rounded-xl border p-3"
              value={section.pageSlug}
              onChange={(event) =>
                setSection({ ...section, pageSlug: event.target.value })
              }
            >
              {pages.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              className="rounded-xl border p-3"
              min="1"
              type="number"
              value={section.blockNumber}
              onChange={(event) =>
                setSection({ ...section, blockNumber: event.target.value })
              }
            />
            <Button type="submit">Сохранить блок</Button>
          </form>
        )}
      </section>
      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm tracking-[0.18em] text-brand uppercase">
              Карточки{selected ? ` · ${selected.name}` : ""}
            </p>
            <h2 className="mt-1 font-heading text-3xl font-semibold text-brand">
              Каталог
            </h2>
          </div>
          <Button disabled={!selected} onClick={openNewCard} type="button">
            + Создать карточку
          </Button>
        </div>
        {!selected ? (
          <p className="mt-6 rounded-2xl bg-page p-4 text-muted-ui-foreground">
            Выберите раздел, чтобы увидеть его карточки.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-muted-ui-foreground">
                <tr>
                  <th className="px-3 py-3">Название</th>
                  <th className="px-3 py-3">Тип</th>
                  <th className="px-3 py-3">Варианты / цена</th>
                  <th className="px-3 py-3">Длительность</th>
                  <th className="px-3 py-3">Места / остаток</th>
                  <th className="px-3 py-3">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {selected.services.map((item) => (
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
                          {variant.durationMin
                            ? `${variant.durationMin} мин`
                            : "—"}
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-4">
                      {item.variants.map((variant) => (
                        <div key={variant.id}>{variant.capacity}</div>
                      ))}
                    </td>
                    <td className="space-x-2 px-3 py-4 whitespace-nowrap">
                      <button
                        className="text-brand underline"
                        onClick={() => openEditCard(item)}
                        type="button"
                      >
                        Редактировать
                      </button>
                      <button
                        className="text-red-700 underline"
                        onClick={() =>
                          setDeleteTarget({ id: item.id, name: item.name })
                        }
                        type="button"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!selected.services.length && (
              <p className="p-6 text-muted-ui-foreground">
                В этом разделе пока нет карточек.
              </p>
            )}
          </div>
        )}
      </section>
      <Modal
        onClose={() => setSectionOpen(false)}
        open={sectionOpen}
        title="Новый раздел"
      >
        <form className="grid gap-3 p-6 md:grid-cols-2" onSubmit={saveSection}>
          {["name", "heading", "subheading"].map((field) => (
            <input
              className="rounded-xl border p-3"
              key={field}
              placeholder={
                field === "name"
                  ? "Название раздела"
                  : field === "heading"
                    ? "Заголовок блока"
                    : "Описание / подзаголовок"
              }
              required={field !== "subheading"}
              value={section[field as keyof typeof section]}
              onChange={(event) =>
                setSection({ ...section, [field]: event.target.value })
              }
            />
          ))}
          <select
            className="rounded-xl border p-3"
            required
            value={section.pageSlug}
            onChange={(event) =>
              setSection({ ...section, pageSlug: event.target.value })
            }
          >
            <option value="">Страница сайта</option>
            {pages.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            className="rounded-xl border p-3"
            min="1"
            placeholder="Номер блока"
            required
            type="number"
            value={section.blockNumber}
            onChange={(event) =>
              setSection({ ...section, blockNumber: event.target.value })
            }
          />
          <Button type="submit">Создать раздел</Button>
        </form>
      </Modal>
      <Modal
        className="max-w-5xl"
        onClose={() => setCardOpen(false)}
        open={cardOpen}
        title={cardId ? "Редактировать карточку" : "Создать карточку"}
      >
        <form className="space-y-4 p-6" onSubmit={saveCard}>
          {cardError && (
            <p
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              role="alert"
            >
              {cardError}
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
                setCard({ ...card, name: event.target.value })
              }
            />
          </label>
          <label className="block text-sm font-semibold text-brand">
            Тип карточки
            <select
              className="mt-2 w-full rounded-xl border p-3"
              value={card.kind}
              onChange={(event) =>
                setCard({
                  ...card,
                  kind: event.target.value as "service" | "product",
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
                setCard({ ...card, description: event.target.value })
              }
            />
          </label>
          <div className="grid gap-3 text-sm font-semibold text-brand md:grid-cols-4">
            <span>{card.kind === "product" ? "Цена, ₽" : "Тип услуги"}</span>
            {card.kind === "service" && <span>Цена, ₽</span>}
            {card.kind === "service" && <span>Длительность, мин</span>}
            <span>
              {card.kind === "product" ? "Остаток" : "Количество мест"}
            </span>
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
                  updateVariantDraft(
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
                      updateVariantDraft(index, { price: event.target.value })
                    }
                  />
                  <input
                    className="rounded-xl border p-3"
                    placeholder="Минуты"
                    required
                    type="number"
                    value={entry.durationMin}
                    onChange={(event) =>
                      updateVariantDraft(index, {
                        durationMin: event.target.value,
                      })
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
                  updateVariantDraft(index, { capacity: event.target.value })
                }
              />
              {card.kind === "service" && (
                <button
                  aria-label="Удалить тип услуги"
                  title="Удалить тип услуги"
                  className="grid size-10 place-items-center rounded-full border border-line text-brand transition hover:border-red-300 hover:text-red-700"
                  disabled={variants.length === 1}
                  onClick={() =>
                    setVariants((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
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
                onClick={() =>
                  setVariants((current) => [...current, blankVariant()])
                }
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
      <ConfirmModal
        confirmLabel="Удалить"
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={() => void removeCard()}
        open={Boolean(deleteTarget)}
        title="Удалить карточку?"
      >
        <p>
          Карточка «{deleteTarget?.name}» будет удалена вместе с вариантами.
        </p>
      </ConfirmModal>
    </div>
  );
};
