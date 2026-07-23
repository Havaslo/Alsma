import { useForm } from "react-hook-form";

import { Form } from "@/components/Form";
import { useCreateAdminBooking } from "@/lib/admin/useAdmin";

const fieldClass =
  "mt-2 w-full rounded-2xl border border-line bg-brand-foreground px-4 py-3";

type BookingFormValues = {
  checkInDate: string;
  checkOutDate: string;
  email: string;
  guestName: string;
  guestsCount: number;
  phone: string;
  roomName: string;
};

export const AdminBookingForm = ({
  onCancel,
}: {
  readonly onCancel?: () => void;
}) => {
  const create = useCreateAdminBooking();
  const form = useForm<BookingFormValues>({
    defaultValues: {
      checkInDate: "",
      checkOutDate: "",
      email: "",
      guestName: "",
      guestsCount: 2,
      phone: "",
      roomName: "",
    },
  });

  return (
    <Form
      className="grid gap-4 rounded-3xl border border-line bg-page p-6 md:grid-cols-2 xl:grid-cols-4"
      form={form}
      onSubmit={(values) => {
        create.mutate(
          { ...values, email: values.email || null },
          { onSuccess: onCancel },
        );
      }}
    >
      <label className="text-sm font-medium">
        Имя гостя
        <input
          className={fieldClass}
          placeholder="Например, Анна Петрова"
          {...form.register("guestName", { required: true })}
        />
      </label>
      <label className="text-sm font-medium">
        Телефон
        <input
          className={fieldClass}
          placeholder="+7 999 000-00-00"
          {...form.register("phone", { required: true })}
        />
      </label>
      <label className="text-sm font-medium">
        Email
        <input
          className={fieldClass}
          placeholder="guest@example.com"
          type="email"
          {...form.register("email")}
        />
      </label>
      <label className="text-sm font-medium">
        Категория номера
        <input
          className={fieldClass}
          placeholder="Полулюкс"
          {...form.register("roomName", { required: true })}
        />
      </label>
      <label className="text-sm font-medium">
        Заезд
        <input
          className={fieldClass}
          type="date"
          {...form.register("checkInDate", { required: true })}
        />
      </label>
      <label className="text-sm font-medium">
        Выезд
        <input
          className={fieldClass}
          type="date"
          {...form.register("checkOutDate", { required: true })}
        />
      </label>
      <label className="text-sm font-medium">
        Количество гостей
        <input
          className={fieldClass}
          max={20}
          min={1}
          type="number"
          {...form.register("guestsCount", {
            max: 20,
            min: 1,
            valueAsNumber: true,
          })}
        />
      </label>
      <div className="flex items-end gap-3">
        {onCancel && (
          <button
            className="rounded-full border border-line px-5 py-3 text-sm font-semibold"
            onClick={onCancel}
            type="button"
          >
            Отмена
          </button>
        )}
        <button
          className="flex-1 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground"
          disabled={create.isPending}
          type="submit"
        >
          Создать заявку
        </button>
      </div>
    </Form>
  );
};
