import { useMemo, useState } from "react";

import { Link } from "@tanstack/react-router";
import {
  BedDouble,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleAlert,
  LoaderCircle,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site/SiteHeader";
import { DatePicker } from "@/components/ui/DatePicker";
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

export const BookingPage = () => {
  const [search, setSearch] = useState<BookingSearch>({
    adults: 2,
    checkIn: iso(start),
    checkOut: iso(end),
    childAges: [],
    currency: "RUB",
    language: "ru",
    nationality: "RU",
  });
  const [submittedSearch, setSubmittedSearch] = useState(search);
  const [step, setStep] = useState(0);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [offer, setOffer] = useState<BookingOffer | null>(null);
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
    setStep(0);
  };
  const selectRoom = (selected: BookingOffer) => {
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
        guests: Array.from({ length: search.adults }, (_, index) => ({
          firstName: index === 0 ? contact.firstName : `Гость ${index + 1}`,
          lastName: contact.lastName,
          type: "adult" as const,
        })),
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
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_10rem_auto]">
                  <label className="rounded-2xl bg-page p-3 text-xs font-semibold text-muted-ui-foreground">
                    Заезд
                    <DatePicker
                      ariaLabel="Дата заезда"
                      onChange={(checkIn) =>
                        setSearch((v) => ({
                          ...v,
                          checkIn,
                          checkOut: v.checkOut < checkIn ? checkIn : v.checkOut,
                        }))
                      }
                      triggerClassName="mt-1 text-page-foreground"
                      value={search.checkIn}
                    />
                  </label>
                  <label className="rounded-2xl bg-page p-3 text-xs font-semibold text-muted-ui-foreground">
                    Выезд
                    <DatePicker
                      ariaLabel="Дата выезда"
                      min={search.checkIn}
                      onChange={(checkOut) =>
                        setSearch((v) => ({ ...v, checkOut }))
                      }
                      triggerClassName="mt-1 text-page-foreground"
                      value={search.checkOut}
                    />
                  </label>
                  <label className="rounded-2xl bg-page p-3 text-xs font-semibold text-muted-ui-foreground">
                    Гости
                    <select
                      className="mt-1 w-full bg-transparent text-base font-semibold text-page-foreground outline-none"
                      onChange={(event) =>
                        setSearch((v) => ({
                          ...v,
                          adults: Number(event.target.value),
                        }))
                      }
                      value={search.adults}
                    >
                      {[1, 2, 3, 4, 5, 6].map((value) => (
                        <option key={value} value={value}>
                          {value} взрослых
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground"
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
                        Выберите номер
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
                          className="grid gap-5 rounded-3xl border border-line bg-page p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                          key={item.roomType}
                        >
                          <div className="grid size-16 place-items-center rounded-2xl bg-brand/10 text-brand">
                            <BedDouble />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">
                              {item.roomType}
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-ui-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Users className="size-4" /> до {search.adults}{" "}
                                гостей
                              </span>
                              <span>{item.roomToSell} доступно</span>
                            </div>
                            <p className="mt-3 text-sm text-muted-ui-foreground">
                              Выберите категорию — на следующем шаге покажем все
                              доступные тарифы и условия.
                            </p>
                          </div>
                          <div className="sm:text-right">
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
                              Выбрать
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
                    Тарифы: {roomName}
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
                                item.discountedPrice || item.price,
                                item.currency,
                              )}
                            </p>
                            <p className="text-sm text-muted-ui-foreground">
                              за проживание
                            </p>
                            <button
                              className="mt-3 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
                              onClick={() => {
                                setOffer(item);
                                setStep(2);
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
              adults={search.adults}
              checkIn={search.checkIn}
              checkOut={search.checkOut}
              nights={nights}
              offer={offer}
            />
          </div>
        )}
      </section>
    </main>
  );
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
  adults,
  checkIn,
  checkOut,
  nights,
  offer,
}: {
  readonly adults: number;
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
      {nights} {nights === 1 ? "ночь" : "ночей"} · {adults} взрослых
    </p>
    {offer ? (
      <div className="mt-5 border-t border-line pt-5">
        <p className="font-semibold">{offer.roomType}</p>
        <p className="mt-1 text-sm text-muted-ui-foreground">
          {offer.rateType} · {offer.boardType}
        </p>
        <p className="mt-5 flex justify-between border-t border-line pt-4 text-lg font-semibold">
          <span>Итого</span>
          <span>
            {money(offer.discountedPrice || offer.price, offer.currency)}
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
