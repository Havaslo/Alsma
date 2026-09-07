import { useState } from "react";

import { useMutation } from "@tanstack/react-query";

import { createManualServiceBooking } from "@/lib/services/admin-services-api";

export const AdminManualBookingModal = ({
  date,
  onClose,
  onCreated,
  selectedVariantId,
  serviceName,
  startsAt,
  variants,
}: {
  readonly date: string;
  readonly onClose: () => void;
  readonly onCreated: () => void;
  readonly serviceName: string;
  readonly startsAt: string;
  readonly selectedVariantId?: string;
  readonly variants: ReadonlyArray<{ id: string; name: string }>;
}) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [variantId, setVariantId] = useState(
    selectedVariantId ?? variants[0]?.id ?? "",
  );
  const mutation = useMutation({
    mutationFn: () =>
      createManualServiceBooking({
        email,
        name,
        phone,
        startsAt,
        variantId,
      }),
    onSuccess: () => {
      onCreated();
      onClose();
    },
  });
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
    >
      <form
        className="w-full max-w-md rounded-3xl bg-brand-foreground p-6 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <p className="text-sm text-muted-ui-foreground">Ручная запись</p>
        <h2 className="mt-1 font-heading text-2xl font-semibold">
          {serviceName}
        </h2>
        <p className="mt-1 text-sm text-muted-ui-foreground">
          {date} ·{" "}
          {new Intl.DateTimeFormat("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(startsAt))}
        </p>
        <div className="mt-5 grid gap-3">
          <label className="grid gap-1 text-sm font-medium">
            Имя
            <input
              required
              className="rounded-xl border border-line px-3 py-2"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Телефон
            <input
              required
              className="rounded-xl border border-line px-3 py-2"
              onChange={(event) => setPhone(event.target.value)}
              value={phone}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Email{" "}
            <span className="font-normal text-muted-ui-foreground">
              (необязательно)
            </span>
            <input
              className="rounded-xl border border-line px-3 py-2"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Вариант услуги
            <select
              className="rounded-xl border border-line px-3 py-2"
              onChange={(event) => setVariantId(event.target.value)}
              value={variantId}
            >
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {mutation.isError && (
          <p className="mt-3 text-sm text-destructive">
            Не удалось создать запись. Проверьте свободное время.
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-full px-4 py-2 text-sm font-semibold"
            onClick={onClose}
            type="button"
          >
            Отмена
          </button>
          <button
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground disabled:opacity-60"
            disabled={mutation.isPending}
            type="submit"
          >
            Записать
          </button>
        </div>
      </form>
    </div>
  );
};
