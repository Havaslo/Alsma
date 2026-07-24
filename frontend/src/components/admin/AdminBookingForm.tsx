import { type Control, Controller, useForm, useWatch } from "react-hook-form";

import { Form } from "@/components/Form";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { TextAreaField, TextField } from "@/components/ui/FormField";
import {
  BOOKING_FORM_SOURCE_OPTIONS,
  type MockBookingDraft,
} from "@/lib/admin/admin-booking-mocks";

const getCurrentDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const AdminBookingForm = ({
  onCancel,
  onCreate,
}: {
  readonly onCancel: () => void;
  readonly onCreate: (values: MockBookingDraft) => void;
}) => {
  const form = useForm<MockBookingDraft>({
    defaultValues: {
      checkInDate: getCurrentDate(),
      checkOutDate: getCurrentDate(),
      email: "",
      guestName: "",
      guestsCount: 2,
      note: "",
      phone: "",
      roomName: "",
      source: "ai-agent",
    },
  });
  const checkInDate = useWatch({
    control: form.control,
    name: "checkInDate",
  });

  return (
    <Form className="space-y-5" form={form} onSubmit={onCreate}>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Имя гостя"
          placeholder="..."
          {...form.register("guestName", { required: true })}
        />
        <TextField
          label="Телефон"
          placeholder="..."
          {...form.register("phone", { required: true })}
        />
        <TextField
          label="Email"
          placeholder="..."
          type="email"
          {...form.register("email")}
        />
        <TextField
          label="Категория номера"
          placeholder="..."
          {...form.register("roomName", { required: true })}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <DateField
          ariaLabel="Дата заезда"
          control={form.control}
          label="Заезд"
          name="checkInDate"
        />
        <DateField
          ariaLabel="Дата выезда"
          control={form.control}
          label="Выезд"
          min={checkInDate}
          name="checkOutDate"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Количество гостей"
          max={20}
          min={1}
          type="number"
          {...form.register("guestsCount", {
            max: 20,
            min: 1,
            valueAsNumber: true,
          })}
        />
        <label className="block text-sm font-medium text-panel-foreground">
          <span>Источник</span>
          <span className="mt-2 block rounded-xl border border-line bg-page px-4 py-2.5">
            <Controller
              control={form.control}
              name="source"
              render={({ field }) => (
                <DropdownSelect
                  ariaLabel="Источник заявки"
                  onChange={field.onChange}
                  options={BOOKING_FORM_SOURCE_OPTIONS}
                  value={field.value}
                />
              )}
            />
          </span>
        </label>
      </div>
      <TextAreaField
        label="Комментарий"
        placeholder="..."
        {...form.register("note")}
      />
      <div className="flex justify-end gap-3">
        <Button onClick={onCancel} variant="secondary">
          Отмена
        </Button>
        <Button type="submit">Создать заявку</Button>
      </div>
    </Form>
  );
};

const DateField = ({
  ariaLabel,
  control,
  label,
  min,
  name,
}: {
  readonly ariaLabel: string;
  readonly control: Control<MockBookingDraft>;
  readonly label: string;
  readonly min?: string;
  readonly name: "checkInDate" | "checkOutDate";
}) => (
  <label className="block text-sm font-medium text-panel-foreground">
    <span>{label}</span>
    <span className="mt-2 block rounded-xl border border-line bg-page px-4 py-2.5">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <DatePicker
            ariaLabel={ariaLabel}
            min={min}
            onChange={field.onChange}
            value={field.value}
          />
        )}
      />
    </span>
  </label>
);
