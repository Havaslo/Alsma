import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  type ServiceResource,
  createServiceResource,
} from "@/lib/services/admin-services-api";

type Props = {
  resources: ServiceResource[];
  onResourceCreated: () => void;
};

export const AdminServiceResourceDirectory = ({
  resources,
  onResourceCreated,
}: Props) => {
  const [name, setName] = useState("");
  const [totalUnits, setTotalUnits] = useState("1");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await createServiceResource({ name, totalUnits: Number(totalUnits) });
    setName("");
    setTotalUnits("1");
    onResourceCreated();
  };

  return (
    <section className="rounded-3xl border border-line bg-brand-foreground p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm tracking-[0.18em] text-brand uppercase">
            Справочник ресурсов
          </p>
          <h2 className="mt-1 font-heading text-2xl font-semibold">
            Ресурсы и доступные единицы
          </h2>
        </div>
        <form className="flex flex-wrap gap-2" onSubmit={submit}>
          <input
            className="rounded-xl border p-2"
            placeholder="Название ресурса"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            className="w-24 rounded-xl border p-2"
            min="1"
            required
            type="number"
            value={totalUnits}
            onChange={(event) => setTotalUnits(event.target.value)}
          />
          <Button type="submit">Добавить</Button>
        </form>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {resources.map((resource) => (
          <span
            className="rounded-full border border-line px-3 py-1 text-sm"
            key={resource.id}
          >
            {resource.name} · {resource.totalUnits} ед.
          </span>
        ))}
      </div>
    </section>
  );
};
