import type { ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Form } from "@/components/Form";
import { DatePicker } from "@/components/ui/DatePicker";
import { DropdownSelect } from "@/components/ui/DropdownSelect";
import { Loader } from "@/components/ui/Loader";
import { useCreateLead } from "@/lib/leads/useCreateLead";

const guestOptions = [
  { label: "2 взрослых", value: 2 },
  { label: "3 взрослых", value: 3 },
  { label: "4 взрослых", value: 4 },
] as const;

const BookingField = ({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) => (
  <label className="grid gap-3 text-left text-[0.72rem] leading-[1.2] font-semibold tracking-[0.02em] text-page-foreground/60">
    <span className="px-1">{label}</span>
    {children}
  </label>
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
      className="mx-auto grid w-full max-w-5xl items-end gap-4 space-y-0 rounded-4xl border border-booking-line/12 bg-booking-shell p-4 text-page-foreground shadow-booking backdrop-blur-booking sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:gap-3 lg:p-5"
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
      <BookingField label="Дата заезда">
        <div className="min-h-15 rounded-full border border-booking-line/20 bg-booking-control px-5 py-3.5">
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
                panelClassName="border-booking-line/20 bg-booking-popover"
                triggerClassName="text-[0.95rem] font-medium tracking-[-0.01em]"
                value={field.value}
              />
            )}
          />
        </div>
      </BookingField>
      <BookingField label="Дата выезда">
        <div className="min-h-15 rounded-full border border-booking-line/20 bg-booking-control px-5 py-3.5">
          <Controller
            control={form.control}
            name="checkOutDate"
            render={({ field }) => (
              <DatePicker
                ariaLabel="Дата выезда"
                min={checkInDate}
                onChange={field.onChange}
                panelClassName="border-booking-line/20 bg-booking-popover"
                triggerClassName="text-[0.95rem] font-medium tracking-[-0.01em]"
                value={field.value}
              />
            )}
          />
        </div>
      </BookingField>
      <BookingField label="Количество гостей">
        <div className="min-h-15 rounded-full border border-booking-line/20 bg-booking-control px-5 py-3.5">
          <Controller
            control={form.control}
            name="guestsCount"
            render={({ field }) => (
              <DropdownSelect
                ariaLabel="Количество гостей"
                menuClassName="border-booking-line/20 bg-booking-popover"
                menuPlacement="top"
                onChange={field.onChange}
                options={guestOptions}
                triggerClassName="text-[0.95rem] font-medium tracking-[-0.01em]"
                value={field.value}
              />
            )}
          />
        </div>
      </BookingField>
      <button
        className="min-h-15 self-end rounded-full bg-brand px-8 py-5 text-sm font-semibold text-brand-foreground transition hover:bg-brand/90 disabled:opacity-60"
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
