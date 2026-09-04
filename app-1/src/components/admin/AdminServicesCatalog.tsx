import { type FormEvent, useMemo, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShoppingBag, Wrench } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  createPlacement,
  createService,
  createVariant,
  loadServiceCatalog,
} from "@/lib/services/admin-services-api";

type CardKind = "service" | "product";
type Section = { readonly slug: string; readonly name: string };
const emptyCard = {
  name: "",
  description: "",
  kind: "service" as CardKind,
  price: "",
  quantity: "",
};

export const AdminServicesCatalog = () => {
  const client = useQueryClient();
  const catalog = useQuery({
    queryKey: ["service-catalog"],
    queryFn: loadServiceCatalog,
  });
  const [sections, setSections] = useState<Section[]>([]);
  const [section, setSection] = useState<Section>();
  const [sectionForm, setSectionForm] = useState({ name: "", slug: "" });
  const [card, setCard] = useState(emptyCard);
  const [variants, setVariants] = useState([
    { name: "", price: "", capacity: "", durationMin: "" },
  ]);
  const refresh = () =>
    void client.invalidateQueries({ queryKey: ["service-catalog"] });
  const existingSections = useMemo(() => {
    const result = new Map<string, Section>();
    catalog.data?.data.services.forEach((item) =>
      item.placements.forEach((placement) =>
        result.set(placement.pageSlug, {
          name: placement.pageSlug,
          slug: placement.pageSlug,
        }),
      ),
    );
    sections.forEach((item) => result.set(item.slug, item));
    return [...result.values()];
  }, [catalog.data, sections]);
  const saveSection = (event: FormEvent) => {
    event.preventDefault();
    const next = { ...sectionForm };
    setSections((current) => [
      ...current.filter((item) => item.slug !== next.slug),
      next,
    ]);
    setSection(next);
    setSectionForm({ name: "", slug: "" });
  };
  const saveCard = async (event: FormEvent) => {
    event.preventDefault();
    if (!section) return;
    const result = await createService({
      slug: `${section.slug}-${card.name.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-")}`,
      name: card.name,
      description: card.description,
    });
    const serviceId = (result.data as { service: { id: string } }).service.id;
    await createPlacement(serviceId, { pageSlug: section.slug, position: 0 });
    const entries =
      card.kind === "product"
        ? [
            {
              name: "Товар",
              price: card.price,
              capacity: card.quantity,
              durationMin: "",
            },
          ]
        : variants;
    await Promise.all(
      entries.map((entry) =>
        createVariant(serviceId, {
          name: entry.name,
          price: Number(entry.price),
          capacity: Number(entry.capacity),
          durationMin: entry.durationMin ? Number(entry.durationMin) : null,
        }),
      ),
    );
    setCard(emptyCard);
    setVariants([{ name: "", price: "", capacity: "", durationMin: "" }]);
    refresh();
  };
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm tracking-[0.18em] text-brand uppercase">
              Шаг 1
            </p>
            <h2 className="mt-1 font-heading text-3xl font-semibold text-brand">
              Разделы каталога
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-ui-foreground">
              Раздел отвечает за место показа карточек: SPA, развлечения, номера
              или любая другая страница сайта. Пока раздел сохраняется после
              создания первой карточки.
            </p>
          </div>
          <Wrench className="hidden size-7 text-brand sm:block" />
        </div>
        <form
          className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={saveSection}
        >
          <input
            className="rounded-xl border border-line bg-page p-3"
            placeholder="Название раздела, например SPA"
            required
            value={sectionForm.name}
            onChange={(event) =>
              setSectionForm({ ...sectionForm, name: event.target.value })
            }
          />
          <input
            className="rounded-xl border border-line bg-page p-3"
            placeholder="Код страницы, например spa"
            required
            value={sectionForm.slug}
            onChange={(event) =>
              setSectionForm({ ...sectionForm, slug: event.target.value })
            }
          />
          <Button type="submit">
            <Plus className="size-4" />
            Создать раздел
          </Button>
        </form>
        <div className="mt-5 flex flex-wrap gap-2">
          {existingSections.map((item) => (
            <button
              className={cn(
                "rounded-full border px-4 py-2 text-sm",
                section?.slug === item.slug
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-line text-brand",
              )}
              key={item.slug}
              onClick={() => setSection(item)}
              type="button"
            >
              {item.name}
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <div className="flex items-start gap-3">
          <ShoppingBag className="mt-1 text-brand" />
          <div>
            <p className="text-sm tracking-[0.18em] text-brand uppercase">
              Шаг 2
            </p>
            <h2 className="mt-1 font-heading text-3xl font-semibold text-brand">
              Карточка в разделе{section ? ` «${section.name}»` : ""}
            </h2>
            <p className="mt-2 text-sm text-muted-ui-foreground">
              Карточка может быть услугой с типами или товаром с ценой и
              количеством.
            </p>
          </div>
        </div>
        {!section ? (
          <p className="mt-6 rounded-2xl bg-page p-4 text-sm text-muted-ui-foreground">
            Сначала выберите или создайте раздел.
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={saveCard}>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded-xl border border-line bg-page p-3"
                placeholder="Название карточки"
                required
                value={card.name}
                onChange={(event) =>
                  setCard({ ...card, name: event.target.value })
                }
              />
              <select
                className="rounded-xl border border-line bg-page p-3"
                value={card.kind}
                onChange={(event) =>
                  setCard({ ...card, kind: event.target.value as CardKind })
                }
              >
                <option value="service">Услуга</option>
                <option value="product">Товар</option>
              </select>
            </div>
            <textarea
              className="min-h-24 w-full rounded-xl border border-line bg-page p-3"
              placeholder="Описание"
              value={card.description}
              onChange={(event) =>
                setCard({ ...card, description: event.target.value })
              }
            />
            {card.kind === "product" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="rounded-xl border border-line bg-page p-3"
                  placeholder="Цена"
                  required
                  type="number"
                  min="0"
                  value={card.price}
                  onChange={(event) =>
                    setCard({ ...card, price: event.target.value })
                  }
                />
                <input
                  className="rounded-xl border border-line bg-page p-3"
                  placeholder="Количество на складе"
                  required
                  type="number"
                  min="0"
                  value={card.quantity}
                  onChange={(event) =>
                    setCard({ ...card, quantity: event.target.value })
                  }
                />
              </div>
            ) : (
              <div className="rounded-2xl bg-page p-4">
                <h3 className="font-semibold text-brand">
                  Тип услуги и параметры
                </h3>
                <div className="mt-3 space-y-3">
                  {variants.map((entry, index) => (
                    <div
                      className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"
                      key={index}
                    >
                      <input
                        className="rounded-xl border border-line bg-panel p-3"
                        placeholder="Тип: тайский массаж"
                        required
                        value={entry.name}
                        onChange={(event) =>
                          setVariants((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, name: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <input
                        className="rounded-xl border border-line bg-panel p-3"
                        placeholder="Цена"
                        required
                        type="number"
                        min="0"
                        value={entry.price}
                        onChange={(event) =>
                          setVariants((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, price: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <input
                        className="rounded-xl border border-line bg-panel p-3"
                        placeholder="Длительность, мин"
                        required
                        type="number"
                        min="1"
                        value={entry.durationMin}
                        onChange={(event) =>
                          setVariants((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, durationMin: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <input
                        className="rounded-xl border border-line bg-panel p-3"
                        placeholder="Количество мест"
                        required
                        type="number"
                        min="1"
                        value={entry.capacity}
                        onChange={(event) =>
                          setVariants((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, capacity: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <button
                        className="rounded-full border border-line px-3 text-sm text-brand disabled:opacity-40"
                        disabled={variants.length === 1}
                        onClick={() =>
                          setVariants((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                        type="button"
                      >
                        Удалить
                      </button>
                    </div>
                  ))}
                  <button
                    className="rounded-full border border-brand px-4 py-2 text-sm text-brand"
                    onClick={() =>
                      setVariants((current) => [
                        ...current,
                        { name: "", price: "", capacity: "", durationMin: "" },
                      ])
                    }
                    type="button"
                  >
                    Добавить тип услуги
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-ui-foreground">
                  Добавьте все типы услуги сейчас. Их можно отредактировать до
                  сохранения.
                </p>
              </div>
            )}
            <Button type="submit">Сохранить карточку</Button>
          </form>
        )}
      </section>
      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <h2 className="font-heading text-2xl font-semibold text-brand">
          Сохранённые карточки
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {catalog.data?.data.services.map((item) => (
            <article className="rounded-2xl bg-page p-4" key={item.id}>
              <div className="flex justify-between gap-3">
                <strong>{item.name}</strong>
                <span className="text-xs text-muted-ui-foreground">
                  {item.placements.map((place) => place.pageSlug).join(", ") ||
                    "Без раздела"}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-ui-foreground">
                {item.variants.length
                  ? item.variants
                      .map(
                        (entry) =>
                          `${entry.name}: ${entry.price} ₽ · ${entry.durationMin ? `${entry.durationMin} мин` : `остаток ${entry.capacity}`}`,
                      )
                      .join("; ")
                  : "Карточка без вариантов"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
