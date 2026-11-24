import { useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";
import { getApiErrorMessage } from "@/lib/api/api-error";

export const AdminTravelLineBookingLink = ({
  userId,
  onLinked,
}: {
  userId: string;
  onLinked: () => void;
}) => {
  const providerQuery = useQuery({
    queryKey: ["booking-provider"],
    queryFn: async () =>
      (await apiClient.get<{ enabled: boolean }>("/travelline/config")).data,
    staleTime: 60_000,
  });
  const [number, setNumber] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      apiClient.post(
        "/admin/travelline/link-booking",
        { userId, bookingNumber: number.trim(), ownershipConfirmed: confirmed },
        { headers: { Authorization: `Bearer ${readAdminSession() ?? ""}` } },
      ),
    onSuccess: () => {
      setNumber("");
      setConfirmed(false);
      toast.success("Бронирование TravelLine привязано.");
      onLinked();
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(error, "Не удалось привязать бронирование."),
      ),
  });
  if (!providerQuery.data?.enabled) return null;
  return (
    <form
      className="rounded-3xl border border-line bg-panel p-6"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <h2 className="text-xl font-semibold">
        Привязать бронирование TravelLine
      </h2>
      <p className="mt-2 text-sm text-muted-ui-foreground">
        Сначала проверьте в TravelLine, что бронь принадлежит этому клиенту.
        После привязки клиент увидит её в личном кабинете, статусы будут
        обновляться автоматически.
      </p>
      <label className="mt-4 grid gap-2 text-sm">
        Номер бронирования
        <input
          required
          maxLength={100}
          pattern="[A-Za-z0-9_-]+"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="rounded-xl border border-line bg-page p-3"
        />
      </label>
      <label className="mt-4 flex items-start gap-2 text-sm">
        <input
          required
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        Подтверждаю: проверено, что бронь принадлежит этому клиенту
      </label>
      <button
        disabled={!confirmed || mutation.isPending}
        type="submit"
        className="mt-4 rounded-full bg-brand px-5 py-3 font-semibold text-brand-foreground disabled:opacity-50"
      >
        {mutation.isPending
          ? "Проверяем бронирование…"
          : "Привязать бронирование"}
      </button>
    </form>
  );
};
