import { type FormEvent, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import {
  AdminServiceCardModal,
  type ServiceCardDraft,
} from "@/components/admin/AdminServiceCardModal";
import { AdminServiceDeleteDialog } from "@/components/admin/AdminServiceDeleteDialog";
import { AdminServiceResourceDirectory } from "@/components/admin/AdminServiceResourceDirectory";
import { AdminServicesTable } from "@/components/admin/AdminServicesTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  createService,
  createServiceSection,
  createVariant,
  deleteService,
  deleteVariant,
  loadServiceResources,
  loadServiceSections,
  updateService,
  updateServiceSection,
  updateVariant,
} from "@/lib/services/admin-services-api";
import { useReorderServices } from "@/lib/services/use-reorder-services";

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
  resources?: Array<{ resourceId: string; quantity: number }>;
};
type ServiceStatus = "draft" | "published" | "archived";
type DeleteTarget = { id: string; name: string };
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
  const resourcesQuery = useQuery({
    queryKey: ["service-resources"],
    queryFn: loadServiceResources,
  });
  const [sectionId, setSectionId] = useState("");
  const [section, setSection] = useState(blankSection());
  const [sectionOpen, setSectionOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardId, setCardId] = useState<string>();
  const [card, setCard] = useState<ServiceCardDraft>({
    name: "",
    description: "",
    kind: "service",
    status: "draft",
    imageUrl: "",
  });
  const [variants, setVariants] = useState<Variant[]>([blankVariant()]);
  const [originalVariantIds, setOriginalVariantIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>();
  const [cardError, setCardError] = useState("");
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, ServiceStatus>
  >({});
  const [statusError, setStatusError] = useState("");
  const refresh = () =>
    void client.invalidateQueries({ queryKey: ["service-sections"] });
  const refreshResources = () => {
    void resourcesQuery.refetch();
    void client.invalidateQueries({ queryKey: ["service-sections"] });
  };
  const selected = query.data?.data.sections.find(
    (item) => item.id === sectionId,
  );
  const handleReorder = useReorderServices(selected, setStatusError);
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
    setCard({
      name: "",
      description: "",
      kind: "service",
      status: "draft",
      imageUrl: "",
    });
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
      status: item.status,
      imageUrl: item.imageUrl ?? "",
    });
    const loadedVariants = item.variants.map((entry) => ({
      id: entry.id,
      name: entry.name,
      price: entry.price,
      capacity: String(entry.capacity),
      durationMin: entry.durationMin ? String(entry.durationMin) : "",
      resources: entry.resources.map(({ resourceId, quantity }) => ({
        resourceId,
        quantity,
      })),
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
    const resourceLimits = new Map(
      (resourcesQuery.data?.data.resources ?? []).map((resource) => [
        resource.id,
        resource,
      ]),
    );
    const invalidAssignment = entries
      .flatMap((entry) => entry.resources ?? [])
      .find((assignment) => {
        const resource = resourceLimits.get(assignment.resourceId);
        return resource && assignment.quantity > resource.totalUnits;
      });
    if (invalidAssignment) {
      const resource = resourceLimits.get(invalidAssignment.resourceId);
      setCardError(
        `Количество ресурса «${resource?.name ?? ""}» не может превышать ${resource?.totalUnits ?? 0}.`,
      );
      return;
    }
    try {
      let serviceId = cardId;
      if (serviceId)
        await updateService(serviceId, {
          slug: `${section.pageSlug}-${serviceId}`,
          name: card.name,
          description: card.description,
          status: card.status,
          sectionId,
          imageUrl: card.imageUrl || null,
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
          imageUrl: card.imageUrl || null,
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
                capacity:
                  card.kind === "service" && (entry.resources?.length ?? 0) > 0
                    ? 1
                    : Number(entry.capacity),
                durationMin: entry.durationMin
                  ? Number(entry.durationMin)
                  : null,
                active: true,
                resources: entry.resources,
              })
            : createVariant(serviceId!, {
                name: entry.name,
                price: Number(entry.price),
                capacity:
                  card.kind === "service" && (entry.resources?.length ?? 0) > 0
                    ? 1
                    : Number(entry.capacity),
                durationMin: entry.durationMin
                  ? Number(entry.durationMin)
                  : null,
                resources: entry.resources,
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
          "Не удалось сохранить карточку: сервер не принял данные изображения или карточки. Проверьте выбранное изображение и попробуйте ещё раз.",
      );
    }
  };
  const updateVariantDraft = (index: number, patch: Partial<Variant>) =>
    setVariants((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  const togglePublication = async (
    item: NonNullable<
      typeof query.data
    >["data"]["sections"][number]["services"][number],
  ) => {
    const currentStatus = statusOverrides[item.id] ?? item.status;
    const nextStatus = currentStatus === "published" ? "draft" : "published";
    setStatusError("");
    setStatusOverrides((current) => ({ ...current, [item.id]: nextStatus }));
    try {
      await updateService(item.id, {
        slug: item.slug,
        name: item.name,
        description: item.description ?? "",
        status: nextStatus,
        sectionId,
      });
      refresh();
    } catch (error) {
      setStatusOverrides((current) => ({
        ...current,
        [item.id]: currentStatus,
      }));
      const message = axios.isAxiosError<{ error?: { message?: string } }>(
        error,
      )
        ? error.response?.data?.error?.message
        : undefined;
      setStatusError(
        message ??
          `Не удалось изменить публикацию карточки «${item.name}». Попробуйте ещё раз.`,
      );
    }
  };
  const removeCard = async () => {
    if (!deleteTarget) return;
    await deleteService(deleteTarget.id);
    setDeleteTarget(undefined);
    refresh();
  };
  return (
    <div className="space-y-6">
      <AdminServiceResourceDirectory
        onResourcesChanged={refreshResources}
        resources={resourcesQuery.data?.data.resources ?? []}
      />
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
          <AdminServicesTable
            onDelete={(item) =>
              setDeleteTarget({ id: item.id, name: item.name })
            }
            onEdit={openEditCard}
            onTogglePublication={(item) => void togglePublication(item)}
            onReorder={(serviceIds) => void handleReorder(serviceIds)}
            selected={selected}
            statusError={statusError}
            statusOverrides={statusOverrides}
          />
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
      <AdminServiceCardModal
        card={card}
        cardId={cardId}
        error={cardError}
        onAddVariant={() =>
          setVariants((current) => [...current, blankVariant()])
        }
        onCardChange={(nextCard) =>
          setCard((current) => ({ ...current, ...nextCard }))
        }
        onClose={() => setCardOpen(false)}
        onRemoveVariant={(index) =>
          setVariants((current) =>
            current.filter((_, itemIndex) => itemIndex !== index),
          )
        }
        onSubmit={saveCard}
        onVariantChange={updateVariantDraft}
        open={cardOpen}
        variants={variants}
        resources={resourcesQuery.data?.data.resources}
      />
      <AdminServiceDeleteDialog
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={() => void removeCard()}
        open={Boolean(deleteTarget)}
        name={deleteTarget?.name}
      />
    </div>
  );
};
