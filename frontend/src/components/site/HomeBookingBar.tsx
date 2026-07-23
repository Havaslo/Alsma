import type { ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { CalendarDays, Users } from "lucide-react";

import { Form } from "@/components/Form";
import { DatePicker } from "@/components/ui/DatePicker";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { Loader } from "@/components/ui/Loader";
import { useCreateLead } from "@/lib/leads/useCreateLead";

const guestOptions = [
  { label: "1 гость", value: 1 },
  { label: "2 гостя", value: 2 },
  { label: "3 гостя", value: 3 },
  { label: "4 гостя", value: 4 },
] as const;

const BookingField = ({
  children,
  icon: Icon,
  label,
}: {
  readonly children: ReactNode;
  readonly icon: typeof CalendarDays;
  readonly label: string;
}) => (
  <div className="rounded-2xl bg-page px-4 py-3 text-left text-xs font-semibold text-muted-ui-foreground">
    <span className="flex items-center gap-2">
      <Icon className="size-4" />
      {label}
    </span>
    <div className="mt-2">{children}</div>
  </div>
);

export const HomeBookingBar = () => {
  const leadMutation = useCreateLead();
  const form = useForm({
    defaultValues: {
      checkInDate: "2026-06-12",
      checkOutDate: "2026-06-15",
      guestsCount: 2,
    },
  });
  const checkInDate = useWatch({
    control: form.control,
    name: "checkInDate",
  });

  return (
    <Form
      className="mx-auto grid w-full max-w-5xl gap-3 rounded-3xl border border-brand-foreground/30 bg-panel/90 p-4 text-page-foreground shadow-2xl backdrop-blur sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"
      form={form}
      id="booking"
      onSubmit={(values) => {
        leadMutation.mutate({
          checkInDate: values.checkInDate,
          checkOutDate: values.checkOutDate,
          formCode: "home-booking-widget",
          formTitle: "Подбор номера на главной странице",
          guestsCount: values.guestsCount,
          sourcePage: "home",
        });
      }}
    >
      <BookingField icon={CalendarDays} label="Дата заезда">
        <Controller
          control={form.control}
          name="checkInDate"
          render={({ field }) => (
            <DatePicker
              ariaLabel="Дата заезда"
              onChange={(date) => {
                field.onChange(date);
                if (date > form.getValues("checkOutDate")) {
                  form.setValue("checkOutDate", date);
                }
              }}
              value={field.value}
            />
          )}
        />
      </BookingField>
      <BookingField icon={CalendarDays} label="Дата выезда">
        <Controller
          control={form.control}
          name="checkOutDate"
          render={({ field }) => (
            <DatePicker
              ariaLabel="Дата выезда"
              min={checkInDate}
              onChange={field.onChange}
              value={field.value}
            />
          )}
        />
      </BookingField>
      <BookingField icon={Users} label="Количество гостей">
        <Controller
          control={form.control}
          name="guestsCount"
          render={({ field }) => (
            <DropdownSelect
              ariaLabel="Количество гостей"
              onChange={field.onChange}
              options={guestOptions}
              value={field.value}
            />
          )}
        />
      </BookingField>
      <button
        className="rounded-2xl bg-brand px-8 py-4 font-semibold text-brand-foreground transition hover:bg-brand/90 disabled:opacity-60"
        disabled={leadMutation.isPending}
        type="submit"
      >
        {leadMutation.isPending ? (
          <Loader className="mx-auto" size="sm" />
        ) : (
          "Найти номер"
        )}
      </button>
    </Form>
  );
};
