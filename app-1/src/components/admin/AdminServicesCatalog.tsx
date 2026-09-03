import { useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPlacement,
  createRule,
  createService,
  createVariant,
  loadServiceCatalog,
} from "@/lib/services/admin-services-api";

export const AdminServicesCatalog = () => {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["service-catalog"],
    queryFn: loadServiceCatalog,
  });
  const [service, setService] = useState({
    slug: "",
    name: "",
    description: "",
  });
  const [variant, setVariant] = useState({
    name: "",
    price: "",
    capacity: "",
    durationMin: "",
  });
  const [page, setPage] = useState("");
  const [rule, setRule] = useState({
    weekday: "1",
    startTime: "10:00",
    endTime: "19:00",
  });
  const refresh = () =>
    void client.invalidateQueries({ queryKey: ["service-catalog"] });
  return (
    <div className="rounded-3xl border border-line bg-brand-foreground p-6">
      <h2 className="font-heading text-3xl font-semibold text-brand">
        Каталог услуг
      </h2>
      <form
        className="mt-5 grid gap-3 md:grid-cols-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await createService(service);
          setService({ slug: "", name: "", description: "" });
          refresh();
        }}
      >
        <input
          className="rounded-xl border p-3"
          placeholder="slug"
          required
          value={service.slug}
          onChange={(event) =>
            setService({ ...service, slug: event.target.value })
          }
        />
        <input
          className="rounded-xl border p-3"
          placeholder="Название услуги"
          required
          value={service.name}
          onChange={(event) =>
            setService({ ...service, name: event.target.value })
          }
        />
        <input
          className="rounded-xl border p-3"
          placeholder="Описание"
          value={service.description}
          onChange={(event) =>
            setService({ ...service, description: event.target.value })
          }
        />
        <button
          className="rounded-full bg-brand p-3 font-semibold text-brand-foreground"
          type="submit"
        >
          Создать услугу
        </button>
      </form>
      <div className="mt-6 space-y-4">
        {query.data?.data.services.map((item) => (
          <article className="rounded-2xl bg-page p-4" key={item.id}>
            <div className="flex justify-between">
              <strong>{item.name}</strong>
              <span>{item.status}</span>
            </div>
            <form
              className="mt-3 grid gap-2 md:grid-cols-5"
              onSubmit={async (event) => {
                event.preventDefault();
                await createVariant(item.id, {
                  name: variant.name,
                  price: Number(variant.price),
                  capacity: Number(variant.capacity),
                  durationMin: Number(variant.durationMin),
                });
                refresh();
              }}
            >
              <input
                className="rounded-xl border p-2"
                placeholder="Вариант"
                required
                value={variant.name}
                onChange={(event) =>
                  setVariant({ ...variant, name: event.target.value })
                }
              />
              <input
                className="rounded-xl border p-2"
                placeholder="Цена"
                required
                type="number"
                value={variant.price}
                onChange={(event) =>
                  setVariant({ ...variant, price: event.target.value })
                }
              />
              <input
                className="rounded-xl border p-2"
                placeholder="Вместимость"
                required
                type="number"
                value={variant.capacity}
                onChange={(event) =>
                  setVariant({ ...variant, capacity: event.target.value })
                }
              />
              <input
                className="rounded-xl border p-2"
                placeholder="Минуты"
                required
                type="number"
                value={variant.durationMin}
                onChange={(event) =>
                  setVariant({ ...variant, durationMin: event.target.value })
                }
              />
              <button
                className="rounded-full bg-brand p-2 text-brand-foreground"
                type="submit"
              >
                Добавить вариант
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {item.variants.map((entry) => (
                <span
                  className="rounded-full border border-line px-3 py-1"
                  key={entry.id}
                >
                  {entry.name} · {entry.capacity} мест · {entry.durationMin} мин
                </span>
              ))}
            </div>
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={async (event) => {
                event.preventDefault();
                await createPlacement(item.id, { pageSlug: page, position: 0 });
                setPage("");
                refresh();
              }}
            >
              <input
                className="rounded-xl border p-2"
                placeholder="Страница размещения: spa"
                required
                value={page}
                onChange={(event) => setPage(event.target.value)}
              />
              <button
                className="rounded-full border border-brand px-3 py-2 text-brand"
                type="submit"
              >
                Разместить
              </button>
            </form>
            <form
              className="mt-2 flex flex-wrap gap-2"
              onSubmit={async (event) => {
                event.preventDefault();
                await createRule(item.id, {
                  weekday: Number(rule.weekday),
                  startTime: rule.startTime,
                  endTime: rule.endTime,
                });
              }}
            >
              <select
                className="rounded-xl border p-2"
                value={rule.weekday}
                onChange={(event) =>
                  setRule({ ...rule, weekday: event.target.value })
                }
              >
                {["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"].map(
                  (day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ),
                )}
              </select>
              <input
                className="rounded-xl border p-2"
                type="time"
                value={rule.startTime}
                onChange={(event) =>
                  setRule({ ...rule, startTime: event.target.value })
                }
              />
              <input
                className="rounded-xl border p-2"
                type="time"
                value={rule.endTime}
                onChange={(event) =>
                  setRule({ ...rule, endTime: event.target.value })
                }
              />
              <button
                className="rounded-full border border-brand px-3 py-2 text-brand"
                type="submit"
              >
                Добавить доступность
              </button>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
};
