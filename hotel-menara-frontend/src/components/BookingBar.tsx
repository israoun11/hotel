import { useState, type FormEvent } from "react";
import { useHotel } from "../context/HotelContext";
import { useI18n } from "../i18n/LanguageContext";
import { addDays, todayISO } from "../lib/dates";
import { validateSearch, type Errors } from "../lib/validation";
import { useRouter } from "../router/Router";

/** Dates and guests, sent to the booking page which then asks the backend for availability. */
export function BookingBar() {
  const { t } = useI18n();
  const { hotel } = useHotel();
  const { navigate } = useRouter();
  const today = todayISO();
  const [checkIn, setCheckIn] = useState(addDays(today, 1));
  const [checkOut, setCheckOut] = useState(addDays(today, 4));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [errors, setErrors] = useState<Errors>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateSearch({ checkIn, checkOut, adults, children }, t, { today, maxStayNights: hotel.maxStayNights });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    navigate(`/booking?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}`);
  };

  const firstError = Object.values(errors)[0];
  return (
    <form className="booking-bar" onSubmit={submit} noValidate aria-label={t.home.barTitle}>
      <div className="booking-bar__field">
        <label htmlFor="bar-in">{t.booking.checkIn}</label>
        <input
          id="bar-in"
          type="date"
          min={today}
          value={checkIn}
          aria-invalid={errors.checkIn ? true : undefined}
          onChange={(e) => {
            setCheckIn(e.target.value);
            if (e.target.value && e.target.value >= checkOut) setCheckOut(addDays(e.target.value, 1));
          }}
        />
      </div>
      <div className="booking-bar__field">
        <label htmlFor="bar-out">{t.booking.checkOut}</label>
        <input id="bar-out" type="date" min={addDays(checkIn || today, 1)} value={checkOut} aria-invalid={errors.checkOut ? true : undefined} onChange={(e) => setCheckOut(e.target.value)} />
      </div>
      <div className="booking-bar__field booking-bar__field--small">
        <label htmlFor="bar-adults">{t.booking.adults}</label>
        <select id="bar-adults" value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="booking-bar__field booking-bar__field--small">
        <label htmlFor="bar-children">{t.booking.children}</label>
        <select id="bar-children" value={children} onChange={(e) => setChildren(Number(e.target.value))}>
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="button button--primary booking-bar__submit">
        {t.home.barSubmit}
      </button>
      {firstError && (
        <p className="booking-bar__error" role="alert">
          {firstError}
        </p>
      )}
    </form>
  );
}
