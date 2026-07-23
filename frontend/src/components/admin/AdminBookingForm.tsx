import { useForm } from "react-hook-form";

import { Form } from "@/components/Form";
import { useCreateAdminBooking } from "@/lib/admin/useAdmin";

const fieldClass = "rounded-xl border border-line bg-page px-3 py-2";
type BookingFormValues = {
  checkInDate: string;
  checkOutDate: string;
  email: string;
  guestName: string;
  guestsCount: number;
  phone: string;
  roomName: string;
};

export const AdminBookingForm = () => {
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
      className="grid gap-3 border-b border-line bg-muted-ui p-5 md:grid-cols-4"
      form={form}
      onSubmit={(values) => {
        create.mutate({
          ...values,
          email: values.email || null,
        });
      }}
    >
      <input
        className={fieldClass}
        placeholder="Имя гостя"
        {...form.register("guestName", { required: true })}
      />
      <input
        className={fieldClass}
        placeholder="Телефон"
        {...form.register("phone", { required: true })}
      />
      <input
        className={fieldClass}
        placeholder="Email"
        type="email"
        {...form.register("email")}
      />
      <input
        className={fieldClass}
        placeholder="Категория номера"
        {...form.register("roomName", { required: true })}
      />
      <input
        className={fieldClass}
        type="date"
        {...form.register("checkInDate", { required: true })}
      />
      <input
        className={fieldClass}
        type="date"
        {...form.register("checkOutDate", { required: true })}
      />
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
      <button
        className="rounded-full bg-brand px-4 py-2 font-semibold text-brand-foreground"
        type="submit"
      >
        Создать бронь
      </button>
    </Form>
  );
};
