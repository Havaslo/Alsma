import { type FormEvent, useState } from "react";

import axios from "axios";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  type ServiceResource,
  createServiceResource,
  deleteServiceResource,
  updateServiceResource,
} from "@/lib/services/admin-services-api";

type Props = {
  resources: ServiceResource[];
  onResourcesChanged: () => void;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as
    { error?: { message?: string }; message?: string } | undefined;
  return data?.error?.message ?? data?.message ?? fallback;
};

export const AdminServiceResourceDirectory = ({
  resources,
  onResourcesChanged,
}: Props) => {
  const [name, setName] = useState("");
  const [totalUnits, setTotalUnits] = useState("1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingTotalUnits, setEditingTotalUnits] = useState("1");
  const [resourceToDelete, setResourceToDelete] =
    useState<ServiceResource | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedName = name.trim();
    const units = Number(totalUnits);
    if (!normalizedName || !Number.isInteger(units) || units < 1) {
      setError("Укажите название и положительное целое количество единиц.");
      return;
    }
    setError("");
    setBusyId("new");
    try {
      await createServiceResource({ name: normalizedName, totalUnits: units });
      setName("");
      setTotalUnits("1");
      onResourcesChanged();
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Не удалось добавить ресурс."));
    } finally {
      setBusyId(null);
    }
  };

  const beginEdit = (resource: ServiceResource) => {
    setError("");
    setEditingId(resource.id);
    setEditingName(resource.name);
    setEditingTotalUnits(String(resource.totalUnits));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingTotalUnits("1");
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingId) return;
    const normalizedName = editingName.trim();
    const units = Number(editingTotalUnits);
    if (!normalizedName || !Number.isInteger(units) || units < 1) {
      setError("Укажите название и положительное целое количество единиц.");
      return;
    }
    setError("");
    setBusyId(editingId);
    try {
      await updateServiceResource(editingId, {
        name: normalizedName,
        totalUnits: units,
      });
      cancelEdit();
      onResourcesChanged();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Не удалось изменить ресурс. Проверьте, что количество не меньше уже назначенного услугам.",
        ),
      );
    } finally {
      setBusyId(null);
    }
  };

  const removeResource = async () => {
    if (!resourceToDelete) return;
    setError("");
    setBusyId(resourceToDelete.id);
    try {
      await deleteServiceResource(resourceToDelete.id);
      setResourceToDelete(null);
      onResourcesChanged();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Не удалось удалить ресурс. Сначала снимите его с услуг, где он используется.",
        ),
      );
    } finally {
      setBusyId(null);
    }
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
            aria-label="Название нового ресурса"
            className="rounded-xl border p-2"
            placeholder="Название ресурса"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            aria-label="Количество единиц нового ресурса"
            className="w-24 rounded-xl border p-2"
            min="1"
            required
            type="number"
            value={totalUnits}
            onChange={(event) => setTotalUnits(event.target.value)}
          />
          <Button disabled={busyId === "new"} type="submit">
            Добавить
          </Button>
        </form>
      </div>
      {error && (
        <p
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="mt-4 grid gap-2">
        {resources.map((resource) =>
          editingId === resource.id ? (
            <form
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand/30 bg-page p-3"
              key={resource.id}
              onSubmit={saveEdit}
            >
              <input
                aria-label={`Название ресурса ${resource.name}`}
                className="min-w-48 flex-1 rounded-xl border p-2"
                required
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
              />
              <input
                aria-label={`Количество единиц ресурса ${resource.name}`}
                className="w-24 rounded-xl border p-2"
                min="1"
                required
                type="number"
                value={editingTotalUnits}
                onChange={(event) => setEditingTotalUnits(event.target.value)}
              />
              <Button disabled={busyId === resource.id} type="submit">
                Сохранить
              </Button>
              <Button
                disabled={busyId === resource.id}
                onClick={cancelEdit}
                type="button"
                variant="secondary"
              >
                Отмена
              </Button>
            </form>
          ) : (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2"
              key={resource.id}
            >
              <div>
                <p className="text-sm font-semibold text-brand">
                  {resource.name} · {resource.totalUnits} ед.
                </p>
                {(resource.assignedVariantsCount ?? 0) > 0 && (
                  <p className="text-xs text-muted-ui-foreground">
                    Назначен в вариантах услуг: {resource.assignedVariantsCount}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  aria-label={`Изменить ресурс ${resource.name}`}
                  className="min-h-9 px-3 py-2"
                  onClick={() => beginEdit(resource)}
                  title="Изменить ресурс"
                  type="button"
                  variant="secondary"
                >
                  <Pencil aria-hidden="true" className="size-4" />
                  Изменить
                </Button>
                <button
                  aria-label={`Удалить ресурс ${resource.name}`}
                  className="grid size-10 place-items-center rounded-xl border border-red-200 text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busyId === resource.id}
                  onClick={() => {
                    setError("");
                    setResourceToDelete(resource);
                  }}
                  title="Удалить ресурс"
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
          ),
        )}
        {!resources.length && (
          <p className="rounded-2xl bg-page p-4 text-sm text-muted-ui-foreground">
            Ресурсы пока не добавлены.
          </p>
        )}
      </div>
      <ConfirmModal
        confirmLabel="Удалить ресурс"
        onClose={() => setResourceToDelete(null)}
        onConfirm={() => void removeResource()}
        open={Boolean(resourceToDelete)}
        title="Удалить ресурс?"
      >
        <p>
          Ресурс «{resourceToDelete?.name}» будет удалён. Если он назначен
          вариантам услуг, удаление будет отклонено — сначала снимите ресурс с
          этих вариантов.
        </p>
        {error && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">
            {error}
          </p>
        )}
      </ConfirmModal>
    </section>
  );
};
