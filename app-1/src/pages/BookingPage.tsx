import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { Link } from "@tanstack/react-router";
import {
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  DoorOpen,
  LoaderCircle,
  Maximize2,
  Minus,
  Plus,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site/SiteHeader";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Modal } from "@/components/ui/Modal";
import { getApiErrorMessage } from "@/lib/api/api-error";
import {
  type BookingOffer,
  type BookingPaymentLink,
  type BookingSearch,
  createBookingReservation,
  loadBookingOffers,
} from "@/lib/booking/booking-api";
import { cn } from "@/lib/cn";
import { useApiQuery } from "@/lib/query/use-api-query";
import { ROUTES } from "@/route-constants";

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const start = new Date();
start.setDate(start.getDate() + 7);
const end = new Date(start);
end.setDate(end.getDate() + 2);
const money = (value: number, currency: string) =>
  new Intl.NumberFormat("ru-RU", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
const dateText = (value: string) =>
  new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(
    new Date(`${value}T12:00:00`),
  );
const displayBoardType = (value: string) =>
  value.trim().toUpperCase() === "FB"
    ? "Полный пансион (завтрак, обед и ужин)"
    : value;

const steps = ["Номера", "Тарифы", "Контакты"];
type RoomChild = {
  id: string;
  birthDate: string;
};
type RoomGuests = {
  id: string;
  adults: number;
  children: RoomChild[];
};
let childIdSequence = 0;
const createChildId = () => `booking-child-${childIdSequence++}`;
let roomIdSequence = 0;
const createRoomId = () => `booking-room-${roomIdSequence++}`;
const ageOnDate = (birthDate: string, onDate: string): number | null => {
  if (!birthDate || !onDate) return null;
  const birth = new Date(`${birthDate}T12:00:00`);
  const target = new Date(`${onDate}T12:00:00`);
  if (!Number.isFinite(birth.getTime()) || !Number.isFinite(target.getTime()))
    return null;
  if (birth > target) return null;
  let age = target.getFullYear() - birth.getFullYear();
  const birthdayThisYear = new Date(
    target.getFullYear(),
    birth.getMonth(),
    birth.getDate(),
    12,
  );
  if (birthdayThisYear > target) age -= 1;
  return age;
};
const childAgesForRooms = (
  rooms: readonly RoomGuests[],
  checkIn: string,
): number[] | null => {
  const ages = rooms.flatMap((room) =>
    room.children.map((child) => ageOnDate(child.birthDate, checkIn)),
  );
  return ages.every((age) => age !== null && age >= 0 && age <= 17)
    ? (ages as number[])
    : null;
};
const getInitialBooking = () => {
  const params = new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  );
  const adults = Math.max(1, Number(params.get("adults")) || 2);
  const roomCount = Math.min(
    2,
    Math.max(1, Number(params.get("roomCount")) || 1),
  );
  const childAgesParam = params.get("childAges");
  const childAgesFromUrl = childAgesParam
    ? childAgesParam
        .split(",")
        .map(Number)
        .filter((age) => Number.isInteger(age) && age >= 0 && age <= 17)
    : [];
  const childrenParam = params.get("children");
  const childrenFromUrl = childrenParam === null ? null : Number(childrenParam);
  const children =
    Number.isInteger(childrenFromUrl) && childrenFromUrl !== null
      ? Math.max(0, Math.min(8, childrenFromUrl))
      : childAgesFromUrl.length;
  const checkIn = params.get("checkIn") || iso(start);
  const checkOut = params.get("checkOut") || iso(end);
  const rooms = Array.from({ length: roomCount }, (_, index) => ({
    id: createRoomId(),
    adults: index === 0 ? Math.max(1, adults - (roomCount - 1)) : 1,
    children:
      index === 0
        ? Array.from({ length: children }, () => ({
            birthDate: "",
            id: createChildId(),
          }))
        : [],
  }));
  return {
    rooms,
    search: {
      adults: rooms.reduce((total, room) => total + room.adults, 0),
      checkIn,
      checkOut,
      childAges: childAgesFromUrl,
      children,
      currency: "RUB",
      language: "ru",
      nationality: "RU",
      roomCount,
    } satisfies BookingSearch,
  };
};

export const BookingPage = () => {
  const initialBooking = useMemo(() => getInitialBooking(), []);
  const [roomGuests, setRoomGuests] = useState<RoomGuests[]>(
    initialBooking.rooms,
  );
  const [search, setSearch] = useState<BookingSearch>(initialBooking.search);
  const [submittedSearch, setSubmittedSearch] = useState(initialBooking.search);
  const [step, setStep] = useState(0);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [offer, setOffer] = useState<BookingOffer | null>(null);
  const [detailsRoom, setDetailsRoom] = useState<BookingOffer | null>(null);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);
  const [selectedRooms, setSelectedRooms] = useState<(BookingOffer | null)[]>([
    null,
  ]);
  const [selectedOffers, setSelectedOffers] = useState<(BookingOffer | null)[]>(
    [null],
  );
  const [contact, setContact] = useState({
    email: "",
    firstName: "",
    lastName: "",
    notes: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"full" | "first_night">(
    "full",
  );
  const [completed, setCompleted] = useState<{
    id: string;
    voucherNumber: string | null;
  } | null>(null);
  const [paymentLinks, setPaymentLinks] = useState<BookingPaymentLink[]>([]);
  const offersQuery = useApiQuery(
    ["booking-offers", submittedSearch],
    (signal) => loadBookingOffers(submittedSearch, signal),
  );
  const offers = offersQuery.data?.offers;
  const rooms = useMemo(() => {
    if (!offers) return [];
    return Array.from(
      new Map(offers.map((item) => [item.roomType, item])).values(),
    );
  }, [offers]);
  const tariffs = selectedRooms[selectedRoomIndex]
    ? (offers ?? []).filter(
        (item) => item.roomType === selectedRooms[selectedRoomIndex]?.roomType,
      )
    : [];
  const nights = Math.max(
    1,
    Math.round(
      (new Date(`${search.checkOut}T12:00:00`).getTime() -
        new Date(`${search.checkIn}T12:00:00`).getTime()) /
        86_400_000,
    ),
  );
  const childrenForBooking = roomGuests.flatMap((room) => room.children);

  const updateRoomGuests = (rooms: RoomGuests[]) => {
    setRoomGuests(rooms);
    setSearch((value) => {
      const childAges = childAgesForRooms(rooms, value.checkIn);
      return {
        ...value,
        adults: rooms.reduce((total, room) => total + room.adults, 0),
        childAges: childAges ?? [],
        children: rooms.reduce(
          (total, room) => total + room.children.length,
          0,
        ),
        roomCount: rooms.length,
      };
    });
  };

  const performSearch = () => {
    if (search.checkOut <= search.checkIn)
      return toast.error("Укажите дату выезда позже даты заезда.");
    const childAges = childAgesForRooms(roomGuests, search.checkIn);
    const childrenCount = roomGuests.reduce(
      (total, room) => total + room.children.length,
      0,
    );
    if (childrenCount > 0 && !childAges)
      return toast.error(
        "Добавьте корректную дату рождения для каждого ребёнка.",
      );
    const nextSearch = {
      ...search,
      adults: roomGuests.reduce((total, room) => total + room.adults, 0),
      childAges: childAges ?? [],
      children: childrenCount,
      roomCount: roomGuests.length,
    };
    setSearch(nextSearch);
    setSubmittedSearch(nextSearch);
    setOffer(null);
    setRoomName(null);
    setSelectedRoomIndex(0);
    setSelectedRooms(Array.from({ length: nextSearch.roomCount }, () => null));
    setSelectedOffers(Array.from({ length: nextSearch.roomCount }, () => null));
    setStep(0);
  };
  const selectRoom = (selected: BookingOffer) => {
    const roomCount = roomGuests.length;
    const currentRooms =
      selectedRooms.length === roomCount
        ? selectedRooms
        : Array.from(
            { length: roomCount },
            (_, index) => selectedRooms[index] ?? null,
          );
    const nextRooms = currentRooms.map((room, index) =>
      index === selectedRoomIndex ? selected : room,
    );
    const nextIndex = nextRooms.findIndex((room) => room === null);
    setSelectedRooms(nextRooms);
    setRoomName(selected.roomType);
    setOffer(null);
    if (roomCount > 1 && nextIndex !== -1) {
      setSelectedRoomIndex(nextIndex);
      setStep(0);
      return;
    }
    setSelectedRoomIndex(0);
    setRoomName(nextRooms[0]?.roomType ?? null);
    setStep(1);
  };
  const openRoomSelection = (roomIndex: number) => {
    setSelectedRoomIndex(roomIndex);
    const room = selectedRooms[roomIndex];
    const selected = selectedOffers[roomIndex];
    setRoomName(room?.roomType ?? null);
    setOffer(selected);
    setStep(room && selected ? 1 : 0);
  };
  const submit = async () => {
    if (!offer || selectedOffers.some((selected) => !selected)) {
      return toast.error("Выберите тариф для каждого номера.");
    }
    const children = childrenForBooking.map(({ birthDate }) => ({
      birthDate,
    }));
    if (
      children.length !== submittedSearch.children ||
      children.some(({ birthDate }) => !birthDate)
    ) {
      return toast.error("Укажите дату рождения каждого ребёнка.");
    }
    if (
      !contact.firstName ||
      !contact.lastName ||
      !contact.email ||
      !contact.phone
    )
      return toast.error("Заполните контактные данные.");
    let childNumber = 0;
    const rooms = roomGuests.map((room, roomIndex) => ({
      adults: room.adults,
      guests: [
        ...Array.from({ length: room.adults }, (_, adultIndex) => ({
          firstName:
            roomIndex === 0 && adultIndex === 0
              ? contact.firstName
              : `Гость ${roomIndex + adultIndex + 2}`,
          lastName: contact.lastName,
          type: "adult" as const,
        })),
        ...room.children.map(({ birthDate }) => ({
          birthDate,
          firstName: `Ребёнок ${++childNumber}`,
          lastName: contact.lastName,
          type: "child" as const,
        })),
      ],
      offerId: selectedOffers[roomIndex]!.id,
    }));
    setSubmitting(true);
    try {
      const result = await createBookingReservation({
        adults: submittedSearch.adults,
        checkIn: submittedSearch.checkIn,
        checkOut: submittedSearch.checkOut,
        currency: submittedSearch.currency,
        nationality: submittedSearch.nationality,
        roomCount: submittedSearch.roomCount,
        contact: {
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
        },
        guests: rooms.flatMap((room) => room.guests),
        notes: contact.notes || undefined,
        offerId: (selectedOffers.find(Boolean) ?? offer).id,
        paymentMethod,
        returnUrl: `${window.location.origin}${ROUTES.booking}?payment=return`,
        rooms: rooms.length > 1 ? rooms : undefined,
      });
      const separatePaymentLinks = result.data.payments ?? [];
      if (separatePaymentLinks.length > 1) {
        setPaymentLinks(separatePaymentLinks);
        setCompleted(result.data.booking);
        setStep(3);
        return;
      }
      if (result.data.payment.confirmationUrl) {
        window.location.assign(result.data.payment.confirmationUrl);
        return;
      }
      setCompleted(result.data.booking);
      setStep(3);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Не удалось оформить бронирование."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-page pb-20 text-page-foreground">
      <SiteHeader
        bookingLabel="К выбору номеров"
        bookingTo={ROUTES.booking}
        light
        transparentAtTop={false}
      />
      <section className="mx-auto max-w-[100rem] px-5 pt-32 sm:px-8">
        <p className="text-sm font-semibold tracking-[0.18em] text-accent-ui-foreground uppercase">
          Онлайн-бронирование
        </p>
        <h1 className="mt-3 font-heading text-4xl font-semibold sm:text-6xl">
          Отдых в АЛСМА
        </h1>
        <div className="mt-8 grid overflow-hidden rounded-2xl border border-line bg-panel sm:grid-cols-3">
          {steps.map((label, index) => (
            <div
              className={cn(
                "flex items-center gap-3 px-5 py-4 text-sm font-semibold sm:justify-center",
                index === step
                  ? "bg-brand text-brand-foreground"
                  : index < step
                    ? "bg-brand/10 text-brand"
                    : "text-muted-ui-foreground",
              )}
              key={label}
            >
              <span className="grid size-6 place-items-center rounded-full border border-current/30 text-xs">
                {index < step ? <Check className="size-4" /> : index + 1}
              </span>
              {label}
            </div>
          ))}
        </div>
        {completed ? (
          <div className="mx-auto mt-14 max-w-2xl rounded-4xl border border-brand/20 bg-panel p-8 text-center shadow-booking sm:p-12">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand text-brand-foreground">
              <Check />
            </div>
            <h2 className="mt-6 font-heading text-4xl font-semibold">
              Бронирование создано
            </h2>
            <p className="mx-auto mt-4 max-w-lg leading-7 text-muted-ui-foreground">
              Бронь создана в системе бронирования. Если оплата ещё не
              завершена, её можно продолжить по ссылке для оплаты.
            </p>
            <p className="mt-6 text-sm text-muted-ui-foreground">
              Номер брони:{" "}
              <strong className="text-page-foreground">
                {completed.voucherNumber ?? completed.id}
              </strong>
            </p>
            {paymentLinks.length > 0 && (
              <div className="mt-8 text-left">
                <h3 className="text-lg font-semibold">
                  Отдельные ссылки на оплату
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
                  Для каждого выбранного номера нужна отдельная оплата. Откройте
                  ссылки ниже — их можно использовать в любом порядке.
                </p>
                <div className="mt-4 space-y-3">
                  {paymentLinks.map((paymentLink, index) => (
                    <div
                      className="flex flex-col gap-3 rounded-2xl border border-line bg-page p-4 sm:flex-row sm:items-center sm:justify-between"
                      key={paymentLink.bookingId}
                    >
                      <div>
                        <p className="font-semibold">
                          {paymentLink.roomName || `Номер ${index + 1}`}
                        </p>
                        <p className="mt-1 text-sm text-muted-ui-foreground">
                          Бронь №{" "}
                          {paymentLink.voucherNumber ?? paymentLink.bookingId}
                        </p>
                      </div>
                      {paymentLink.confirmationUrl ? (
                        <a
                          className="inline-flex shrink-0 justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground"
                          href={paymentLink.confirmationUrl}
                        >
                          Перейти к оплате
                        </a>
                      ) : (
                        <span className="text-sm text-muted-ui-foreground">
                          Ссылка пока недоступна
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Link
              className="mt-8 inline-flex rounded-xl bg-brand px-6 py-3 font-semibold text-brand-foreground"
              to={ROUTES.account}
            >
              Перейти в личный кабинет
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <section className="rounded-3xl border border-line bg-panel p-4 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_1fr_auto]">
                  <div>
                    <span className="mb-1 block px-1 text-xs font-semibold text-muted-ui-foreground">
                      Даты проживания
                    </span>
                    <DateRangePicker
                      adults={search.adults}
                      childAges={search.childAges}
                      children={search.children}
                      checkIn={search.checkIn}
                      checkOut={search.checkOut}
                      roomCount={search.roomCount}
                      onChange={({ checkIn, checkOut }) =>
                        setSearch((v) => ({
                          ...v,
                          checkIn,
                          checkOut,
                          childAges:
                            childAgesForRooms(roomGuests, checkIn) ?? [],
                        }))
                      }
                      triggerClassName="min-h-[3.75rem] rounded-2xl bg-page p-3 text-page-foreground"
                    />
                  </div>
                  <div>
                    <span className="mb-1 block px-1 text-xs font-semibold text-muted-ui-foreground">
                      Гости и номера
                    </span>
                    <RoomsPicker
                      rooms={roomGuests}
                      checkIn={search.checkIn}
                      onChange={updateRoomGuests}
                    />
                  </div>
                  <button
                    className="h-[3.75rem] self-end rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground"
                    onClick={performSearch}
                    type="button"
                  >
                    Найти
                  </button>
                </div>
              </section>
              {step === 0 && (
                <section className="mt-6">
                  <div className="mb-5 flex items-end justify-between">
                    <div>
                      <h2 className="font-heading text-3xl font-semibold">
                        Выберите номер {selectedRoomIndex + 1}
                      </h2>
                      <p className="mt-1 text-sm text-muted-ui-foreground">
                        Доступные варианты на выбранные даты
                      </p>
                    </div>
                    <span className="text-sm text-muted-ui-foreground">
                      {offers?.length ?? 0} тарифов
                    </span>
                  </div>
                  {offersQuery.isLoading ? (
                    <div className="grid place-items-center py-20 text-brand">
                      <LoaderCircle className="size-8 animate-spin" />
                    </div>
                  ) : rooms.length ? (
                    <div className="space-y-4">
                      {rooms.map((item) => (
                        <article
                          className="grid overflow-hidden rounded-3xl border border-line bg-page sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center"
                          key={item.roomType}
                        >
                          <div className="relative aspect-square w-full bg-brand/10 text-brand sm:aspect-auto sm:h-full sm:min-h-0">
                            {item.roomImageUrl ? (
                              <img
                                alt={item.roomType}
                                className="size-full object-cover"
                                loading="lazy"
                                src={item.roomImageUrl}
                              />
                            ) : (
                              <div className="grid size-full place-items-center">
                                <BedDouble />
                              </div>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-col p-5 sm:py-4 sm:pr-3">
                            <h3 className="truncate text-xl font-semibold">
                              {item.roomType}
                            </h3>
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-ui-foreground">
                              {plainRoomDescription(item.roomDescription) ||
                                "Выберите категорию — на следующем шаге покажем все доступные тарифы и условия."}
                            </p>
                            <button
                              className="mt-2 w-fit text-sm font-semibold text-brand underline-offset-4 hover:underline"
                              onClick={() => setDetailsRoom(item)}
                              type="button"
                            >
                              Подробнее
                            </button>
                            <div className="mt-auto flex flex-wrap gap-2 pt-4 text-sm text-muted-ui-foreground">
                              <span className="rounded-full border border-brand/15 bg-brand/5 px-2.5 py-1.5">
                                <RoomFact
                                  icon={<Maximize2 className="size-5" />}
                                  value={
                                    item.roomArea
                                      ? `${item.roomArea} м²`
                                      : "Площадь уточняется"
                                  }
                                />
                              </span>
                              <span className="rounded-full border border-brand/15 bg-brand/5 px-2.5 py-1.5">
                                <RoomFact
                                  icon={<DoorOpen className="size-5" />}
                                  value={`${item.roomCount ?? 1} ${roomWord(item.roomCount ?? 1)}`}
                                />
                              </span>
                              <span className="rounded-full border border-brand/15 bg-brand/5 px-2.5 py-1.5">
                                <RoomFact
                                  icon={<UsersRound className="size-5" />}
                                  value={`до ${item.roomCapacity ?? search.adults} гостей`}
                                />
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-end p-5 pt-0 sm:h-full sm:pt-5 sm:pr-5 sm:pl-2 sm:text-right">
                            <p className="text-sm text-muted-ui-foreground">
                              от
                            </p>
                            <p className="text-xl font-semibold">
                              {money(
                                item.discountedPrice || item.price,
                                item.currency,
                              )}
                            </p>
                            <button
                              className="mt-3 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
                              onClick={() => selectRoom(item)}
                              type="button"
                            >
                              Выбрать для номера {selectedRoomIndex + 1}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </section>
              )}
              {step === 1 && (
                <section className="mt-6">
                  <TariffRoomPreviews
                    selectedRooms={selectedRooms}
                    selectedOffers={selectedOffers}
                    selectedRoomIndex={selectedRoomIndex}
                    onSelect={openRoomSelection}
                  />
                  <button
                    className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-brand"
                    onClick={() => setStep(0)}
                    type="button"
                  >
                    <ChevronLeft className="size-4" />К номерам
                  </button>
                  <h2 className="font-heading text-3xl font-semibold">
                    Тарифы для номера {selectedRoomIndex + 1}: {roomName}
                  </h2>
                  <div className="mt-5 space-y-4">
                    {tariffs.map((item) => (
                      <article
                        className={cn(
                          "rounded-3xl border p-6",
                          offer?.id === item.id
                            ? "border-brand bg-brand/5"
                            : "border-line bg-page",
                        )}
                        key={item.id}
                      >
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="text-xl font-semibold">
                              {item.rateType}
                            </h3>
                            <p className="mt-1 text-muted-ui-foreground">
                              Питание:{" "}
                              {item.boardType
                                ? displayBoardType(item.boardType)
                                : "не включено"}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {rateBenefits(item).map((benefit) => (
                                <span
                                  className="rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-medium text-brand"
                                  key={benefit}
                                >
                                  {benefit}
                                </span>
                              ))}
                            </div>
                            <details className="group mt-4">
                              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-brand">
                                Подробнее о тарифе{" "}
                                <ChevronDown className="size-4 group-open:hidden" />
                                <ChevronUp className="hidden size-4 group-open:block" />
                              </summary>
                              <p className="mt-3 text-sm leading-6 text-muted-ui-foreground">
                                {item.rateDescription || cancellationText(item)}
                              </p>
                            </details>
                          </div>
                          <div className="shrink-0 sm:text-right">
                            <p className="text-2xl font-semibold">
                              {money(
                                item.discountedPrice || item.price,
                                item.currency,
                              )}
                            </p>
                            <p className="text-sm text-muted-ui-foreground">
                              за номер
                            </p>
                            <button
                              className="mt-3 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
                              onClick={() => {
                                const currentOffers = Array.from(
                                  { length: selectedRooms.length },
                                  (_, index) => selectedOffers[index] ?? null,
                                );
                                const nextOffers = currentOffers.map(
                                  (selected, index) =>
                                    index === selectedRoomIndex
                                      ? item
                                      : selected,
                                );
                                setSelectedOffers(nextOffers);
                                const nextIndex = nextOffers.findIndex(
                                  (selected) => selected === null,
                                );
                                if (nextIndex !== -1) {
                                  setSelectedRoomIndex(nextIndex);
                                  setRoomName(
                                    selectedRooms[nextIndex]?.roomType ?? null,
                                  );
                                  setOffer(null);
                                  setStep(1);
                                } else {
                                  setOffer(item);
                                  setStep(2);
                                }
                              }}
                              type="button"
                            >
                              Выбрать тариф
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {step === 2 && (
                <section className="mt-6 max-w-3xl">
                  <button
                    className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-brand"
                    onClick={() => setStep(1)}
                    type="button"
                  >
                    <ChevronLeft className="size-4" />К тарифам
                  </button>
                  <h2 className="font-heading text-3xl font-semibold">
                    Контактные данные
                  </h2>
                  <p className="mt-2 text-muted-ui-foreground">
                    На эти контакты придёт подтверждение бронирования.
                  </p>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {(
                      [
                        ["firstName", "Имя"],
                        ["lastName", "Фамилия"],
                        ["phone", "Телефон"],
                        ["email", "Email"],
                      ] as const
                    ).map(([field, label]) => (
                      <label
                        className="grid gap-2 text-sm font-medium"
                        key={field}
                      >
                        {label}
                        <input
                          className="field-control"
                          onChange={(event) =>
                            setContact((value) => ({
                              ...value,
                              [field]: event.target.value,
                            }))
                          }
                          placeholder={label}
                          type={field === "email" ? "email" : "text"}
                          value={contact[field]}
                        />
                      </label>
                    ))}
                  </div>
                  <label className="mt-4 grid gap-2 text-sm font-medium">
                    Комментарий
                    <textarea
                      className="field-control min-h-28 resize-y"
                      onChange={(event) =>
                        setContact((value) => ({
                          ...value,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Особые пожелания к размещению"
                      value={contact.notes}
                    />
                  </label>
                  <div className="mt-6 rounded-2xl border border-line bg-page p-4">
                    <p className="font-semibold">Как оплатить</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          [
                            "full",
                            "Полная стоимость",
                            "Оплатить всю сумму бронирования",
                          ],
                          [
                            "first_night",
                            "Первые сутки",
                            "Оплатить предоплату за первые сутки",
                          ],
                        ] as const
                      ).map(([value, title, description]) => (
                        <label
                          className={cn(
                            "cursor-pointer rounded-2xl border p-4",
                            paymentMethod === value
                              ? "border-brand bg-brand/5"
                              : "border-line",
                          )}
                          key={value}
                        >
                          <input
                            className="mr-2"
                            checked={paymentMethod === value}
                            name="paymentMethod"
                            onChange={() => setPaymentMethod(value)}
                            type="radio"
                            value={value}
                          />
                          <span className="font-semibold">{title}</span>
                          <span className="mt-1 block pl-6 text-sm text-muted-ui-foreground">
                            {description}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-muted-ui-foreground">
                      После создания брони вы перейдёте на защищённую страницу
                      для оплаты.
                      {roomGuests.length > 1 && (
                        <>
                          {" "}
                          Для каждого выбранного номера будет своя бронь и
                          отдельная ссылка оплаты.
                        </>
                      )}
                    </p>
                    <div className="mt-4 rounded-2xl border border-accent-ui/30 bg-accent-ui/10 p-4 text-sm leading-6">
                      <p className="font-semibold text-page-foreground">
                        Важно: оплатить бронь нужно в течение 30 минут.
                      </p>
                      <p className="mt-1 text-muted-ui-foreground">
                        Если оплата не будет завершена за это время, бронь
                        автоматически отменится.
                      </p>
                    </div>
                  </div>
                  <button
                    className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 font-semibold text-brand-foreground disabled:opacity-60"
                    disabled={submitting}
                    onClick={submit}
                    type="button"
                  >
                    {submitting && (
                      <LoaderCircle className="size-4 animate-spin" />
                    )}
                    Перейти к оплате
                  </button>
                </section>
              )}
            </div>
            <BookingSummary
              roomGuests={roomGuests}
              selectedRooms={selectedRooms}
              selectedOffers={selectedOffers}
              checkIn={search.checkIn}
              checkOut={search.checkOut}
              nights={nights}
              offer={offer}
              onSelectRoom={openRoomSelection}
            />
          </div>
        )}
      </section>
      <RoomDetailsModal
        key={detailsRoom?.id ?? "closed"}
        room={detailsRoom}
        onClose={() => setDetailsRoom(null)}
        onSelect={(selected) => {
          setDetailsRoom(null);
          selectRoom(selected);
        }}
      />
    </main>
  );
};

const TariffRoomPreviews = ({
  selectedRooms,
  selectedOffers,
  selectedRoomIndex,
  onSelect,
}: {
  readonly selectedRooms: (BookingOffer | null)[];
  readonly selectedOffers: (BookingOffer | null)[];
  readonly selectedRoomIndex: number;
  readonly onSelect: (index: number) => void;
}) => (
  <div className="mb-5 grid gap-3 sm:grid-cols-2">
    {selectedRooms.map((room, index) =>
      room ? (
        <button
          className={cn(
            "flex items-center gap-3 rounded-2xl border p-2 text-left transition",
            selectedRoomIndex === index
              ? "border-brand bg-brand/5"
              : "border-line bg-page hover:border-brand/50",
          )}
          key={room.id}
          onClick={() => onSelect(index)}
          type="button"
        >
          <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-brand/10">
            {room.roomImageUrl ? (
              <img
                alt=""
                className="size-full object-cover"
                src={room.roomImageUrl}
              />
            ) : (
              <div className="grid size-full place-items-center text-brand">
                <BedDouble className="size-5" />
              </div>
            )}
          </div>
          <span className="min-w-0">
            <strong className="block">Номер {index + 1}</strong>
            <span className="block truncate text-sm text-muted-ui-foreground">
              {room.roomType}
            </span>
            <span className="block text-xs text-brand">
              {selectedOffers[index] ? "Тариф выбран" : "Выберите тариф"}
            </span>
          </span>
        </button>
      ) : null,
    )}
  </div>
);

const RoomFact = ({
  icon,
  value,
}: {
  readonly icon: ReactNode;
  readonly value: string;
}) => (
  <span className="inline-flex items-center gap-1.5">
    <span className="text-brand">{icon}</span>
    {value}
  </span>
);
const roomWord = (count: number) =>
  count === 1 ? "комната" : count < 5 ? "комнаты" : "комнат";
const plainRoomDescription = (value: string | null) =>
  value
    ?.replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim() ?? "";
const RoomDetailsModal = ({
  room,
  onClose,
  onSelect,
}: {
  readonly room: BookingOffer | null;
  readonly onClose: () => void;
  readonly onSelect: (room: BookingOffer) => void;
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const images = room?.roomImageUrls.length
    ? room.roomImageUrls
    : room?.roomImageUrl
      ? [room.roomImageUrl]
      : [];
  const activeImage =
    images[Math.min(activeIndex, Math.max(images.length - 1, 0))];

  return (
    <Modal
      open={Boolean(room)}
      onClose={onClose}
      title={room?.roomType ?? "Описание номера"}
      className="max-w-6xl"
      closeLabel="Закрыть"
      hideHeader
    >
      {room && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.28fr)_minmax(18rem,0.72fr)]">
          <div className="min-w-0">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-brand/10 text-brand">
              {activeImage ? (
                <img
                  alt={room.roomType}
                  className="size-full object-cover"
                  src={activeImage}
                />
              ) : (
                <div className="grid size-full place-items-center">
                  <BedDouble className="size-10" />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {images.map((image, index) => (
                  <button
                    aria-label={`Показать фото ${index + 1}`}
                    className={cn(
                      "aspect-square overflow-hidden rounded-xl border-2 bg-brand/5",
                      index === activeIndex
                        ? "border-brand"
                        : "border-transparent",
                    )}
                    key={`${image}-${index}`}
                    onClick={() => setActiveIndex(index)}
                    type="button"
                  >
                    <img
                      alt=""
                      className="size-full object-cover"
                      src={image}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <p className="text-sm font-semibold tracking-[0.16em] text-brand uppercase">
              Номер
            </p>
            <h3 className="mt-2 font-heading text-3xl font-semibold">
              {room.roomType}
            </h3>
            <div className="mt-6 grid gap-3 rounded-2xl bg-muted-ui/30 p-4">
              <RoomFact
                icon={<Maximize2 />}
                value={
                  room.roomArea ? `${room.roomArea} м²` : "Площадь уточняется"
                }
              />
              <RoomFact
                icon={<DoorOpen />}
                value={`${room.roomCount ?? 1} ${roomWord(room.roomCount ?? 1)}`}
              />
              <RoomFact
                icon={<UsersRound />}
                value={`до ${room.roomCapacity ?? "—"} гостей`}
              />
            </div>
            {room.bedOptions && (
              <p className="mt-5 text-sm">
                <strong>Спальные места:</strong> {room.bedOptions}
              </p>
            )}
            <div className="mt-6">
              <h4 className="text-lg font-semibold">Описание номера</h4>
              <p className="mt-2 text-sm leading-7 whitespace-pre-line text-muted-ui-foreground">
                {plainRoomDescription(room.roomDescription) ||
                  "Подробное описание для этого номера пока не предоставлено отелем."}
              </p>
            </div>
            <button
              className="mt-8 w-full rounded-xl bg-brand px-5 py-3.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand/90"
              onClick={() => onSelect(room)}
              type="button"
            >
              Выбрать номер
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

const RoomsPicker = ({
  checkIn,
  rooms,
  onChange,
}: {
  readonly checkIn: string;
  readonly rooms: RoomGuests[];
  readonly onChange: (rooms: RoomGuests[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
  }, [open]);

  const updateRoom = (index: number, room: RoomGuests) =>
    onChange(rooms.map((current, item) => (item === index ? room : current)));
  return (
    <div className="relative" ref={rootRef}>
      <button
        className="flex min-h-[3.75rem] w-full items-center justify-between gap-2 rounded-2xl bg-page p-3 text-left text-base font-semibold text-page-foreground outline-none"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>
          {rooms.length} {rooms.length === 1 ? "номер" : "номера"} ·{" "}
          {rooms.reduce((total, room) => total + room.adults, 0)} взрослых ·{" "}
          {rooms.reduce((total, room) => total + room.children.length, 0)} детей
        </span>
        <ChevronDown className="size-4 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+0.5rem)] left-0 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-4 text-page-foreground shadow-2xl">
          {rooms.map((room, index) => (
            <div
              className={cn(index > 0 && "mt-4 border-t border-line pt-4")}
              key={index}
            >
              <div className="flex items-center justify-between">
                <strong>Номер {index + 1}</strong>
                {rooms.length > 1 && (
                  <button
                    aria-label={`Удалить номер ${index + 1}`}
                    className="text-destructive"
                    onClick={() =>
                      onChange(rooms.filter((_, item) => item !== index))
                    }
                    type="button"
                  >
                    Удалить
                  </button>
                )}
              </div>
              <GuestCounter
                label="Взрослые"
                value={room.adults}
                min={1}
                max={12}
                onChange={(adults) => updateRoom(index, { ...room, adults })}
              />
              <div className="mt-4 rounded-2xl border border-line bg-page p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-sm">Дети</strong>
                    <p className="mt-1 text-xs text-muted-ui-foreground">
                      Добавьте ребёнка и укажите дату рождения.
                    </p>
                  </div>
                  <button
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-brand px-2.5 py-1.5 text-xs font-semibold text-brand disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={room.children.length >= 8}
                    onClick={() =>
                      updateRoom(index, {
                        ...room,
                        children: [
                          ...room.children,
                          { birthDate: "", id: createChildId() },
                        ],
                      })
                    }
                    type="button"
                  >
                    <Plus className="size-3.5" />
                    Добавить
                  </button>
                </div>
                {room.children.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-ui-foreground">
                    Детей пока нет.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {room.children.map((child, childIndex) => (
                      <div
                        className="flex items-end gap-2 rounded-xl border border-line bg-white p-2"
                        key={child.id}
                      >
                        <label className="grid min-w-0 flex-1 gap-1 text-xs font-medium">
                          <span>Ребёнок {childIndex + 1}</span>
                          <input
                            aria-label={`Дата рождения ребёнка ${childIndex + 1} в номере ${index + 1}`}
                            className="field-control min-h-10 px-2 text-sm"
                            max={checkIn}
                            onChange={(event) =>
                              updateRoom(index, {
                                ...room,
                                children: room.children.map((currentChild) =>
                                  currentChild.id === child.id
                                    ? {
                                        ...currentChild,
                                        birthDate: event.target.value,
                                      }
                                    : currentChild,
                                ),
                              })
                            }
                            type="date"
                            value={child.birthDate}
                          />
                        </label>
                        <button
                          aria-label={`Удалить ребёнка ${childIndex + 1} из номера ${index + 1}`}
                          className="grid size-10 shrink-0 place-items-center rounded-lg border border-line text-muted-ui-foreground hover:border-destructive hover:text-destructive"
                          onClick={() =>
                            updateRoom(index, {
                              ...room,
                              children: room.children.filter(
                                (currentChild) => currentChild.id !== child.id,
                              ),
                            })
                          }
                          type="button"
                        >
                          <Minus className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {rooms.length < 2 && (
            <button
              className="mt-4 w-full rounded-xl border border-brand px-4 py-2 text-sm font-semibold text-brand"
              onClick={() =>
                onChange([
                  ...rooms,
                  { id: createRoomId(), adults: 1, children: [] },
                ])
              }
              type="button"
            >
              <Plus className="mr-1 inline size-4" />
              Добавить номер
            </button>
          )}
          <button
            className="mt-3 w-full rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground"
            onClick={() => setOpen(false)}
            type="button"
          >
            Готово
          </button>
        </div>
      )}
    </div>
  );
};

const GuestCounter = ({
  label,
  value,
  min,
  max,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
}) => (
  <div className="mt-3 flex items-center justify-between gap-4">
    <span>{label}</span>
    <div className="flex items-center gap-3">
      <button
        aria-label={`Уменьшить: ${label}`}
        className="grid size-8 place-items-center rounded-full border border-line disabled:opacity-40"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        type="button"
      >
        <Minus className="size-3" />
      </button>
      <strong className="w-5 text-center">{value}</strong>
      <button
        aria-label={`Увеличить: ${label}`}
        className="grid size-8 place-items-center rounded-full border border-line disabled:opacity-40"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        type="button"
      >
        <Plus className="size-3" />
      </button>
    </div>
  </div>
);

const rateBenefits = (offer: BookingOffer) => {
  const benefits = [...offer.benefits];
  if (offer.boardType) benefits.unshift(displayBoardType(offer.boardType));
  if (
    offer.cancellationPenalty &&
    (offer.cancellationPenalty["is-refundable"] ||
      offer.cancellationPenalty.isRefundable)
  )
    benefits.push("Бесплатная отмена");
  return Array.from(new Set(benefits.filter(Boolean))).slice(0, 5);
};
const cancellationText = (offer: BookingOffer) => {
  const policy = offer.cancellationPenalty;
  if (!policy) return "Условия отмены уточняются";
  const days = policy["period-in-days"] ?? policy.periodInDays;
  return policy["is-refundable"] || policy.isRefundable
    ? "Бесплатная отмена"
    : days
      ? `Отмена возможна не позднее чем за ${days} дн.`
      : "Невозвратный тариф";
};
const EmptyState = () => (
  <div className="rounded-3xl border border-dashed border-line bg-page p-10 text-center">
    <CalendarDays className="mx-auto size-8 text-brand" />
    <h3 className="mt-4 text-lg font-semibold">На эти даты вариантов нет</h3>
    <p className="mt-2 text-sm text-muted-ui-foreground">
      Попробуйте изменить даты или количество гостей.
    </p>
  </div>
);
const BookingSummary = ({
  roomGuests,
  selectedRooms,
  selectedOffers,
  checkIn,
  checkOut,
  nights,
  offer,
  onSelectRoom,
}: {
  readonly roomGuests: RoomGuests[];
  readonly selectedRooms: (BookingOffer | null)[];
  readonly selectedOffers: (BookingOffer | null)[];
  readonly checkIn: string;
  readonly checkOut: string;
  readonly nights: number;
  readonly offer: BookingOffer | null;
  readonly onSelectRoom: (index: number) => void;
}) => (
  <aside className="sticky top-28 rounded-3xl border border-line bg-panel p-6">
    <h2 className="font-heading text-2xl font-semibold">Ваше бронирование</h2>
    <div className="mt-6 grid grid-cols-2 gap-5 border-b border-line pb-5 text-sm">
      <div>
        <p className="text-muted-ui-foreground">Заезд</p>
        <p className="mt-1 font-semibold">{dateText(checkIn)}</p>
        <p className="text-muted-ui-foreground">после 16:00</p>
      </div>
      <div>
        <p className="text-muted-ui-foreground">Выезд</p>
        <p className="mt-1 font-semibold">{dateText(checkOut)}</p>
        <p className="text-muted-ui-foreground">до 14:00</p>
      </div>
    </div>
    <p className="mt-5 text-sm text-muted-ui-foreground">
      {nights} {nights === 1 ? "ночь" : "ночей"}
    </p>
    <div className="mt-4 space-y-3">
      {roomGuests.map((room, index) => (
        <div
          className="rounded-2xl border border-line bg-page p-3 text-sm"
          key={index}
        >
          <button
            className="flex w-full items-center justify-between gap-2 text-left"
            onClick={() => onSelectRoom(index)}
            type="button"
          >
            <strong>Номер {index + 1}</strong>
            {selectedOffers[index] ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                Изменить <Check className="size-4" />
              </span>
            ) : (
              <span className="text-xs font-semibold text-brand">Выбрать</span>
            )}
          </button>
          <p className="mt-1 text-muted-ui-foreground">
            {room.adults} взрослых · {room.children.length} детей
          </p>
          <p className="mt-2 font-medium text-brand">
            {selectedRooms[index]?.roomType ?? "Номер ещё не выбран"}
          </p>
          {selectedOffers[index] && (
            <p className="mt-1 text-xs text-muted-ui-foreground">
              {selectedOffers[index]?.rateType} ·{" "}
              {money(
                selectedOffers[index]!.discountedPrice ||
                  selectedOffers[index]!.price,
                selectedOffers[index]!.currency,
              )}
            </p>
          )}
        </div>
      ))}
    </div>
    {offer ? (
      <div className="mt-5 border-t border-line pt-5">
        <p className="font-semibold">{offer.roomType}</p>
        <p className="mt-1 text-sm text-muted-ui-foreground">
          {offer.rateType} · {displayBoardType(offer.boardType)}
        </p>
        <p className="mt-5 flex justify-between border-t border-line pt-4 text-lg font-semibold">
          <span>Итого</span>
          <span>
            {money(
              selectedOffers.reduce(
                (total, selected) =>
                  total +
                  (selected ? selected.discountedPrice || selected.price : 0),
                0,
              ),
              offer.currency,
            )}
          </span>
        </p>
      </div>
    ) : (
      <p className="mt-6 text-sm text-muted-ui-foreground">
        Выберите номер и тариф, чтобы увидеть итог.
      </p>
    )}
  </aside>
);
