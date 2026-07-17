import { useState } from "react";

import { useCreateAdminBooking } from "@/lib/admin/useAdmin";

const fieldClass = "rounded-xl border border-line bg-page px-3 py-2";
export const AdminBookingForm = () => {
  const create = useCreateAdminBooking();
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guestsCount, setGuestsCount] = useState(2);
  const [roomName, setRoomName] = useState("");
  return (
    <form
      className="grid gap-3 border-b border-line bg-muted-ui p-5 md:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate({
          checkInDate,
          checkOutDate,
          email: email || null,
          guestName,
          guestsCount,
          phone,
          roomName,
        });
      }}
    >
      <input
        className={fieldClass}
        onChange={(event) => setGuestName(event.target.value)}
        placeholder="Имя гостя"
        required
        value={guestName}
      />
      <input
        className={fieldClass}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="Телефон"
        required
        value={phone}
      />
      <input
        className={fieldClass}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email"
        type="email"
        value={email}
      />
      <input
        className={fieldClass}
        onChange={(event) => setRoomName(event.target.value)}
        placeholder="Категория номера"
        required
        value={roomName}
      />
      <input
        className={fieldClass}
        onChange={(event) => setCheckInDate(event.target.value)}
        required
        type="date"
        value={checkInDate}
      />
      <input
        className={fieldClass}
        onChange={(event) => setCheckOutDate(event.target.value)}
        required
        type="date"
        value={checkOutDate}
      />
      <input
        className={fieldClass}
        min={1}
        max={20}
        onChange={(event) => setGuestsCount(Number(event.target.value))}
        type="number"
        value={guestsCount}
      />
      <button
        className="rounded-full bg-brand px-4 py-2 font-semibold text-brand-foreground"
        type="submit"
      >
        Создать бронь
      </button>
    </form>
  );
};
