import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { Link } from "@tanstack/react-router";
import {
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  CircleAlert,
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

const steps = ["Номера", "Тарифы", "Контакты"];
type RoomGuests = { adults: number; childAges: number[] };
const initialRooms: RoomGuests[] = [{ adults: 2, childAges: [] }];

export const BookingPage = () => {
  const [roomGuests, setRoomGuests] = useState<RoomGuests[]>(initialRooms);
  const [search, setSearch] = useState<BookingSearch>({
    adults: 2,
    checkIn: iso(start),
    checkOut: iso(end),
    childAges: [],
    currency: "RUB",
    language: "ru",
    nationality: "RU",
    roomCount: 1,
  });
  const [submittedSearch, setSubmittedSearch] = useState(search);
  const [step, setStep] = useState(0);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [offer, setOffer] = useState<BookingOffer | null>(null);
  const [detailsRoom, setDetailsRoom] = useState<BookingOffer | null>(null);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);
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
  const [completed, setCompleted] = useState<{
    id: string;
    voucherNumber: string | null;
  } | null>(null);
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
  const tariffs = offer
    ? (offers ?? []).filter((item) => item.roomType === offer.roomType)
    : [];
  const nights = Math.max(
    1,
    Math.round(
      (new Date(`${search.checkOut}T12:00:00`).getTime() -
        new Date(`${search.checkIn}T12:00:00`).getTime()) /
        86_400_000,
    ),
  );

  const performSearch = () => {
    if (search.checkOut <= search.checkIn)
      return toast.error("Укажите дату выезда позже даты заезда.");
    setSubmittedSearch(search);
    setOffer(null);
    setRoomName(null);
    setSelectedRoomIndex(0);
    setSelectedOffers(Array.from({ length: search.roomCount }, () => null));
    setStep(0);
  };
  const selectRoom = (selected: BookingOffer) => {
    const nextIndex = selectedOffers.findIndex((item) => item === null);
    const roomIndex = nextIndex === -1 ? 0 : nextIndex;
    setSelectedRoomIndex(roomIndex);
    setRoomName(selected.roomType);
    setOffer(selected);
    setStep(1);
  };
  const submit = async () => {
    if (!offer) return;
    if (
      !contact.firstName ||
      !contact.lastName ||
      !contact.email ||
      !contact.phone
    )
      return toast.error("Заполните контактные данные.");
    setSubmitting(true);
    try {
      const result = await createBookingReservation({
        ...search,
        contact: {
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
        },
        guests: [
          ...Array.from({ length: search.adults }, (_, index) => ({
            firstName: index === 0 ? contact.firstName : `Гость ${index + 1}`,
            lastName: contact.lastName,
            type: "adult" as const,
          })),
          ...search.childAges.map((age, index) => ({
            birthDate: undefined,
            firstName: `Ребёнок ${index + 1}`,
            lastName: contact.lastName,
            type: age < 1 ? ("baby" as const) : ("child" as const),
          })),
        ],
        notes: contact.notes || undefined,
        offerId: offer.id,
      });
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
              Мы зафиксировали ваш выбор. Оплата будет доступна на следующем
              этапе после подключения платёжного сервиса.
            </p>
            <p className="mt-6 text-sm text-muted-ui-foreground">
              Номер брони:{" "}
              <strong className="text-page-foreground">
                {completed.voucherNumber ?? completed.id}
              </strong>
            </p>
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
                      checkIn={search.checkIn}
                      checkOut={search.checkOut}
                      onChange={({ checkIn, checkOut }) =>
                        setSearch((v) => ({ ...v, checkIn, checkOut }))
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
                      onChange={(rooms) => {
                        setRoomGuests(rooms);
                        setSearch((value) => ({
                          ...value,
                          adults: rooms.reduce(
                            (total, room) => total + room.adults,
                            0,
                          ),
                          childAges: rooms.flatMap((room) =>
                            room.childAges.filter((age) => age >= 0),
                          ),
                          roomCount: rooms.length,
                        }));
                      }}
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
                                (item.discountedPrice || item.price) *
                                  search.roomCount,
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
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-xl font-semibold">
                              {item.rateType}
                            </h3>
                            <p className="mt-1 text-muted-ui-foreground">
                              Питание: {item.boardType || "не включено"}
                            </p>
                            <p className="mt-3 text-sm text-muted-ui-foreground">
                              {cancellationText(item)}
                            </p>
                          </div>
                          <div className="sm:text-right">
                            <p className="text-2xl font-semibold">
                              {money(
                                (item.discountedPrice || item.price) *
                                  search.roomCount,
                                item.currency,
                              )}
                            </p>
                            <p className="text-sm text-muted-ui-foreground">
                              за проживание
                            </p>
                            <button
                              className="mt-3 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
                              onClick={() => {
                                const nextOffers = selectedOffers.map(
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
                                  setRoomName(null);
                                  setOffer(null);
                                  setStep(0);
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
                  <div className="mt-6 rounded-2xl border border-accent-ui/30 bg-accent-ui/10 p-4 text-sm leading-6 text-page-foreground">
                    <CircleAlert className="mr-2 inline size-4 text-accent-ui-foreground" />
                    Онлайн-оплата пока не подключена. После создания
                    бронирование получит статус «Ожидает оплаты».
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
                    Подтвердить бронирование
                  </button>
                </section>
              )}
            </div>
            <BookingSummary
              roomCount={search.roomCount}
              roomGuests={roomGuests}
              selectedOffers={selectedOffers}
              checkIn={search.checkIn}
              checkOut={search.checkOut}
              nights={nights}
              offer={offer}
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
  rooms,
  onChange,
}: {
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
          {rooms.reduce((total, room) => total + room.childAges.length, 0)}{" "}
          детей
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
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span>Дети</span>
                  <span className="text-xs text-muted-ui-foreground">
                    в этом номере
                  </span>
                </div>
                {(room.childAges.length ? room.childAges : [-1]).map(
                  (age, childIndex) => {
                    const childCount = room.childAges.length;
                    return (
                      <div
                        className="mt-2 flex items-center gap-2"
                        key={`${childIndex}-${age}`}
                      >
                        <select
                          className="field-control min-h-9 flex-1 bg-white py-1"
                          aria-label={`Возраст ребёнка ${childIndex + 1} в номере ${index + 1}`}
                          value={age}
                          onChange={(event) => {
                            const nextAge = Number(event.target.value);
                            if (nextAge < 0) {
                              updateRoom(index, { ...room, childAges: [] });
                              return;
                            }
                            updateRoom(index, {
                              ...room,
                              childAges: childCount
                                ? room.childAges.map((current, item) =>
                                    item === childIndex ? nextAge : current,
                                  )
                                : [nextAge],
                            });
                          }}
                        >
                          <option value={-1}>Нет</option>
                          {Array.from({ length: 18 }, (_, value) => (
                            <option key={value} value={value}>
                              {value === 0
                                ? "до 1 года"
                                : `${value} ${value === 1 ? "год" : value < 5 ? "года" : "лет"}`}
                            </option>
                          ))}
                        </select>
                        {childIndex === 0 && (
                          <input
                            aria-label={`Количество детей в номере ${index + 1}`}
                            className="field-control min-h-9 w-16 bg-white px-2 py-1 text-center"
                            disabled={age < 0}
                            min={age < 0 ? 0 : 1}
                            max={8}
                            onChange={(event) => {
                              const count = Math.max(
                                0,
                                Math.min(8, Number(event.target.value) || 0),
                              );
                              updateRoom(index, {
                                ...room,
                                childAges:
                                  age < 0 || count === 0
                                    ? []
                                    : Array.from({ length: count }, () => age),
                              });
                            }}
                            type="number"
                            value={age < 0 ? 0 : childCount}
                          />
                        )}
                        {age >= 0 && (
                          <button
                            aria-label={`Удалить ребёнка из номера ${index + 1}`}
                            className="text-muted-ui-foreground"
                            onClick={() =>
                              updateRoom(index, {
                                ...room,
                                childAges: room.childAges.filter(
                                  (_, item) => item !== childIndex,
                                ),
                              })
                            }
                            type="button"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  },
                )}
                {room.childAges.length < 8 && (
                  <button
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand"
                    onClick={() =>
                      updateRoom(index, {
                        ...room,
                        childAges: [...room.childAges, 5],
                      })
                    }
                    type="button"
                  >
                    <Plus className="size-4" />
                    Добавить ребёнка
                  </button>
                )}
              </div>
            </div>
          ))}
          {rooms.length < 2 && (
            <button
              className="mt-4 w-full rounded-xl border border-brand px-4 py-2 text-sm font-semibold text-brand"
              onClick={() => onChange([...rooms, { adults: 1, childAges: [] }])}
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
  roomCount,
  roomGuests,
  selectedOffers,
  checkIn,
  checkOut,
  nights,
  offer,
}: {
  readonly roomCount: number;
  readonly roomGuests: RoomGuests[];
  readonly selectedOffers: (BookingOffer | null)[];
  readonly checkIn: string;
  readonly checkOut: string;
  readonly nights: number;
  readonly offer: BookingOffer | null;
}) => (
  <aside className="sticky top-28 rounded-3xl border border-line bg-panel p-6 shadow-booking">
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
          <div className="flex items-center justify-between gap-2">
            <strong>Номер {index + 1}</strong>
            {selectedOffers[index] && <Check className="size-4 text-brand" />}
          </div>
          <p className="mt-1 text-muted-ui-foreground">
            {room.adults} взрослых ·{" "}
            {room.childAges.filter((age) => age >= 0).length} детей
          </p>
          <p className="mt-2 font-medium text-brand">
            {selectedOffers[index]?.roomType ?? "Номер ещё не выбран"}
          </p>
        </div>
      ))}
    </div>
    {offer ? (
      <div className="mt-5 border-t border-line pt-5">
        <p className="font-semibold">{offer.roomType}</p>
        <p className="mt-1 text-sm text-muted-ui-foreground">
          {offer.rateType} · {offer.boardType}
        </p>
        <p className="mt-5 flex justify-between border-t border-line pt-4 text-lg font-semibold">
          <span>Итого</span>
          <span>
            {money(
              (offer.discountedPrice || offer.price) * roomCount,
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
