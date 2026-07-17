import { type ReactNode, useState } from "react";

import { CalendarDays, Users } from "lucide-react";

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
  const [checkInDate, setCheckInDate] = useState("2026-06-12");
  const [checkOutDate, setCheckOutDate] = useState("2026-06-15");
  const [guestsCount, setGuestsCount] = useState(2);
  const leadMutation = useCreateLead();

  return (
    <form
      className="mx-auto grid w-full max-w-5xl gap-3 rounded-3xl border border-brand-foreground/30 bg-panel/90 p-4 text-page-foreground shadow-2xl backdrop-blur sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"
      id="booking"
      onSubmit={(event) => {
        event.preventDefault();
        leadMutation.mutate({
          checkInDate,
          checkOutDate,
          formCode: "home-booking-widget",
          formTitle: "Подбор номера на главной странице",
          guestsCount,
          sourcePage: "home",
        });
      }}
    >
      <BookingField icon={CalendarDays} label="Дата заезда">
        <DatePicker
          ariaLabel="Дата заезда"
          onChange={(date) => {
            setCheckInDate(date);
            if (date > checkOutDate) setCheckOutDate(date);
          }}
          value={checkInDate}
        />
      </BookingField>
      <BookingField icon={CalendarDays} label="Дата выезда">
        <DatePicker
          ariaLabel="Дата выезда"
          min={checkInDate}
          onChange={setCheckOutDate}
          value={checkOutDate}
        />
      </BookingField>
      <BookingField icon={Users} label="Количество гостей">
        <DropdownSelect
          ariaLabel="Количество гостей"
          onChange={setGuestsCount}
          options={guestOptions}
          value={guestsCount}
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
    </form>
  );
};
