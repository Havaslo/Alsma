import { type FormEvent, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  createService,
  createServiceSection,
  createVariant,
  loadServiceSections,
  updateServiceSection,
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
type CardKind = "service" | "product";
type VariantDraft = {
  name: string;
  price: string;
  capacity: string;
  durationMin: string;
};
const blankVariant = (): VariantDraft => ({
  name: "",
  price: "",
  capacity: "",
  durationMin: "",
});

export const AdminServicesCatalog = () => {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["service-sections"],
    queryFn: loadServiceSections,
  });
  const [sectionId, setSectionId] = useState("");
  const [editingSection, setEditingSection] = useState(false);
  const [newSectionOpen, setNewSectionOpen] = useState(false);
  const [section, setSection] = useState({
    name: "",
    pageSlug: "",
    heading: "",
    subheading: "",
    blockNumber: "1",
  });
  const [card, setCard] = useState({
    name: "",
    description: "",
    kind: "service" as CardKind,
  });
  const [variants, setVariants] = useState<VariantDraft[]>([blankVariant()]);
  const refresh = () =>
    void client.invalidateQueries({ queryKey: ["service-sections"] });
  const saveSection = async (event: FormEvent) => {
    event.preventDefault();
    const input = {
      ...section,
      subheading: section.subheading || undefined,
      blockNumber: Number(section.blockNumber),
    };
    const result =
      editingSection && sectionId
        ? await updateServiceSection(sectionId, {
            ...input,
            subheading: input.subheading ?? null,
          })
        : await createServiceSection(input);
    setSectionId(result.data.section.id);
    setEditingSection(false);
    setNewSectionOpen(false);
    refresh();
  };
  const saveCard = async (event: FormEvent) => {
    event.preventDefault();
    if (!sectionId) return;
    const result = await createService({
      slug: `${section.pageSlug}-${Date.now()}`,
      name: card.name,
      description: card.description,
      sectionId,
    });
    const serviceId = (result.data as { service: { id: string } }).service.id;
    const entries =
      card.kind === "product"
        ? [
            {
              name: "Товар",
              price: variants[0].price,
              capacity: variants[0].capacity,
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
    setCard({ name: "", description: "", kind: "service" });
    setVariants([blankVariant()]);
    refresh();
  };
  const updateVariant = (index: number, patch: Partial<VariantDraft>) =>
    setVariants((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm tracking-[0.18em] text-brand uppercase">
              Разделы каталога
            </p>
            <h2 className="mt-1 font-heading text-3xl font-semibold text-brand">
              Выберите группу
            </h2>
          </div>
          <Button
            onClick={() => {
              setSectionId("");
              setSection({
                name: "",
                pageSlug: "",
                heading: "",
                subheading: "",
                blockNumber: "1",
              });
              setNewSectionOpen(true);
            }}
            type="button"
          >
            <Plus className="size-4" /> Новый раздел
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {query.data?.data.sections.map((item) => (
            <button
              className={`rounded-full border px-4 py-2 text-sm ${item.id === sectionId ? "border-brand bg-brand text-brand-foreground" : "border-line text-brand"}`}
              key={item.id}
              onClick={() => {
                setSectionId(item.id);
                setSection({
                  name: item.name,
                  pageSlug: item.pageSlug,
                  heading: item.heading,
                  subheading: item.subheading ?? "",
                  blockNumber: String(item.blockNumber),
                });
              }}
              type="button"
            >
              {item.name}
            </button>
          ))}
        </div>
        {!query.data?.data.sections.length && (
          <p className="mt-4 text-sm text-muted-ui-foreground">
            Разделов пока нет. Создайте первый через кнопку «Новый раздел».
          </p>
        )}
        {sectionId && (
          <form
            className="mt-6 grid gap-3 rounded-2xl bg-page p-4 md:grid-cols-2"
            onSubmit={saveSection}
          >
            <div className="md:col-span-2">
              <p className="text-xs tracking-[0.18em] text-brand uppercase">
                Управление блоком
              </p>
              <p className="mt-1 text-sm text-muted-ui-foreground">
                Настройки выбранного раздела
              </p>
            </div>
            <input
              className="rounded-xl border border-line bg-panel p-3"
              placeholder="Заголовок"
              required
              value={section.heading}
              onChange={(event) =>
                setSection({ ...section, heading: event.target.value })
              }
            />
            <input
              className="rounded-xl border border-line bg-panel p-3"
              placeholder="Описание / подзаголовок"
              value={section.subheading}
              onChange={(event) =>
                setSection({ ...section, subheading: event.target.value })
              }
            />
            <select
              className="rounded-xl border border-line bg-panel p-3"
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
              className="rounded-xl border border-line bg-panel p-3"
              min="1"
              placeholder="Номер блока"
              required
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
      <Modal
        onClose={() => setNewSectionOpen(false)}
        open={newSectionOpen}
        title="Новый раздел"
      >
        <form className="grid gap-3 p-6 md:grid-cols-2" onSubmit={saveSection}>
          <input
            className="rounded-xl border border-line bg-page p-3"
            placeholder="Название раздела"
            required
            value={section.name}
            onChange={(event) =>
              setSection({ ...section, name: event.target.value })
            }
          />
          <select
            className="rounded-xl border border-line bg-page p-3"
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
            className="rounded-xl border border-line bg-page p-3"
            placeholder="Заголовок блока"
            required
            value={section.heading}
            onChange={(event) =>
              setSection({ ...section, heading: event.target.value })
            }
          />
          <input
            className="rounded-xl border border-line bg-page p-3"
            placeholder="Подзаголовок блока"
            value={section.subheading}
            onChange={(event) =>
              setSection({ ...section, subheading: event.target.value })
            }
          />
          <input
            className="rounded-xl border border-line bg-page p-3"
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
      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <p className="text-sm tracking-[0.18em] text-brand uppercase">
          Карточка
        </p>
        <h2 className="mt-1 font-heading text-3xl font-semibold text-brand">
          Добавить в раздел{section.name ? ` «${section.name}»` : ""}
        </h2>
        {!sectionId ? (
          <p className="mt-5 rounded-2xl bg-page p-4 text-sm text-muted-ui-foreground">
            Сначала создайте или выберите раздел.
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
            <div className="rounded-2xl bg-page p-4">
              <h3 className="font-semibold text-brand">
                {card.kind === "product" ? "Цена и остаток" : "Типы услуги"}
              </h3>
              {variants.map((entry, index) => (
                <div
                  className="mt-3 grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]"
                  key={index}
                >
                  <input
                    className="rounded-xl border border-line bg-panel p-3"
                    placeholder={
                      card.kind === "product"
                        ? "Цена"
                        : "Тип, например тайский массаж"
                    }
                    required
                    value={card.kind === "product" ? entry.price : entry.name}
                    onChange={(event) =>
                      updateVariant(
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
                        className="rounded-xl border border-line bg-panel p-3"
                        placeholder="Цена"
                        required
                        type="number"
                        min="0"
                        value={entry.price}
                        onChange={(event) =>
                          updateVariant(index, { price: event.target.value })
                        }
                      />
                      <input
                        className="rounded-xl border border-line bg-panel p-3"
                        placeholder="Минуты"
                        required
                        type="number"
                        min="1"
                        value={entry.durationMin}
                        onChange={(event) =>
                          updateVariant(index, {
                            durationMin: event.target.value,
                          })
                        }
                      />
                    </>
                  )}
                  <input
                    className="rounded-xl border border-line bg-panel p-3"
                    placeholder={card.kind === "product" ? "Остаток" : "Мест"}
                    required
                    type="number"
                    min={card.kind === "product" ? "0" : "1"}
                    value={entry.capacity}
                    onChange={(event) =>
                      updateVariant(index, { capacity: event.target.value })
                    }
                  />
                  <button
                    className="rounded-full border border-line px-3 text-sm text-brand disabled:opacity-40"
                    disabled={variants.length === 1}
                    onClick={() =>
                      setVariants((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    type="button"
                  >
                    Удалить
                  </button>
                </div>
              ))}
              {card.kind === "service" && (
                <button
                  className="mt-3 rounded-full border border-brand px-4 py-2 text-sm text-brand"
                  onClick={() =>
                    setVariants((current) => [...current, blankVariant()])
                  }
                  type="button"
                >
                  Добавить тип
                </button>
              )}
            </div>
            <Button type="submit">Сохранить карточку</Button>
          </form>
        )}
      </section>
    </div>
  );
};
