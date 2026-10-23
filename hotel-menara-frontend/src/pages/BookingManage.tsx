import { useState, type FormEvent } from "react";
import { api } from "../api";
import type { Booking } from "../api/types";
import { Notice } from "../components/Feedback";
import { TextField } from "../components/Fields";
import { useHotel } from "../context/HotelContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useSubmit } from "../hooks/useSubmit";
import { useI18n } from "../i18n/LanguageContext";
import { errorMessage } from "../lib/errors";
import { formatMoney, formatRange } from "../lib/format";
import { telHref } from "../lib/hotel";
import { validateLookup, type Errors } from "../lib/validation";
import { Link, useRouter } from "../router/Router";

/** Public booking lookup: POST /bookings/lookup with the reference and the guest's e-mail. */
export function BookingManagePage() {
  const { t, lang } = useI18n();
  const { hotel } = useHotel();
  const { search } = useRouter();
  const [reference, setReference] = useState(search.get("reference") ?? "");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const { pending, run } = useSubmit();
  useDocumentTitle(t.manage.title);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateLookup({ reference, email }, t);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0) return;
    await run(async () => {
      try {
        setBooking(await api.lookupBooking(reference.trim().toUpperCase(), email.trim()));
      } catch (error) {
        setBooking(null);
        setFailure(errorMessage(error, t));
      }
    });
  };

  return (
    <section className="manage">
      <header>
        <h1 className="display-1">{t.manage.title}</h1>
        <p className="lead">{t.manage.lead}</p>
      </header>
      <form className="form manage__form" onSubmit={submit} noValidate>
        {failure && <Notice tone="error">{failure}</Notice>}
        <div className="form__row">
          <TextField label={t.manage.reference} hint={t.manage.referenceHint} value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} error={errors.reference} autoComplete="off" spellCheck={false} required />
          <TextField label={t.manage.email} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
        </div>
        <button type="submit" className="button button--primary" disabled={pending} aria-busy={pending}>
          {pending ? t.manage.searching : t.manage.submit}
        </button>
      </form>

      {booking && (
        <div className="manage__result" aria-live="polite">
          <h2 className="display-3">{t.manage.resultTitle}</h2>
          <dl className="summary-list summary-list--wide">
            <div>
              <dt>{t.booking.reference}</dt>
              <dd className="confirmation__reference">{booking.reference}</dd>
            </div>
            <div>
              <dt>{t.booking.status}</dt>
              <dd>
                <span className={`status status--${booking.status}`}>{t.booking.statuses[booking.status]}</span>
              </dd>
            </div>
            {booking.cancellationReason && (
              <div>
                <dt>{t.manage.cancellationReason}</dt>
                <dd>{booking.cancellationReason}</dd>
              </div>
            )}
            <div>
              <dt>{t.manage.room}</dt>
              <dd>{booking.roomName}</dd>
            </div>
            <div>
              <dt>{t.manage.dates}</dt>
              <dd>
                {formatRange(booking.checkIn, booking.checkOut, lang)}, {t.common.nights(booking.nights)}
              </dd>
            </div>
            <div>
              <dt>{t.manage.guests}</dt>
              <dd>{[t.common.adults(booking.adults), booking.children > 0 ? t.common.children(booking.children) : null].filter(Boolean).join(", ")}</dd>
            </div>
            <div>
              <dt>{t.manage.total}</dt>
              <dd>{formatMoney(booking.pricing.total, booking.pricing.currency, lang)}</dd>
            </div>
          </dl>
          <p className="form__note">
            {t.manage.contactToChange} <a href={telHref(hotel.phone)}>{hotel.phone}</a>, <a href={`mailto:${hotel.email}`}>{hotel.email}</a>
          </p>
        </div>
      )}
      <p>
        <Link to="/booking" className="text-link">
          {t.nav.book}
        </Link>
      </p>
    </section>
  );
}
