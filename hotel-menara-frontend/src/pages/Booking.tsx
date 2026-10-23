import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../api";
import { ApiError } from "../api/client";
import { ROOM_TYPES, type AvailabilityResult, type AvailabilityRoom, type Booking, type Pricing, type RoomType } from "../api/types";
import { Notice } from "../components/Feedback";
import { TextArea, TextField } from "../components/Fields";
import { Photo } from "../components/Photo";
import { useHotel } from "../context/HotelContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useSubmit } from "../hooks/useSubmit";
import { useI18n } from "../i18n/LanguageContext";
import { bookingRequest, submitBooking } from "../lib/booking";
import { addDays, parseISODate, todayISO } from "../lib/dates";
import { errorMessage, fieldErrorsFrom } from "../lib/errors";
import { formatDay, formatMoney, formatRange } from "../lib/format";
import { isDemoRoom, roomView, telHref } from "../lib/hotel";
import { validateGuest, validateSearch, type Errors, type GuestInput } from "../lib/validation";
import { Link, useRouter } from "../router/Router";

type Step = "search" | "results" | "guest" | "done";

interface Search {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  roomType?: RoomType;
  roomId?: string;
}

const EMPTY_GUEST: GuestInput = { firstName: "", lastName: "", email: "", phone: "", specialRequests: "" };

function searchFromUrl(params: URLSearchParams, today: string): Search {
  const int = (key: string, fallback: number) => {
    const n = Number(params.get(key));
    return params.get(key) !== null && Number.isInteger(n) ? n : fallback;
  };
  const checkIn = parseISODate(params.get("checkIn") ?? "") ? (params.get("checkIn") as string) : addDays(today, 1);
  const checkOut = parseISODate(params.get("checkOut") ?? "") ? (params.get("checkOut") as string) : addDays(checkIn, 3);
  const roomType = params.get("roomType");
  const roomId = params.get("roomId");
  return {
    checkIn,
    checkOut,
    adults: int("adults", 2),
    children: int("children", 0),
    roomType: ROOM_TYPES.includes(roomType as RoomType) ? (roomType as RoomType) : undefined,
    roomId: roomId && /^[a-f\d]{24}$/i.test(roomId) ? roomId : undefined,
  };
}

function PriceLines({ pricing }: { pricing: Pricing }) {
  const { t, lang } = useI18n();
  const money = (n: number) => formatMoney(n, pricing.currency, lang);
  return (
    <dl className="price-lines">
      <div>
        <dt>
          {t.booking.nightlyRate} × {t.common.nights(pricing.nights)}
        </dt>
        <dd>{money(pricing.nightlyRate)}</dd>
      </div>
      <div>
        <dt>{t.booking.subtotal}</dt>
        <dd>{money(pricing.subtotal)}</dd>
      </div>
      {pricing.taxAmount > 0 && (
        <div>
          <dt>{t.booking.tax(pricing.taxRatePercent)}</dt>
          <dd>{money(pricing.taxAmount)}</dd>
        </div>
      )}
      {pricing.touristTax > 0 && (
        <div>
          <dt>{t.booking.touristTax}</dt>
          <dd>{money(pricing.touristTax)}</dd>
        </div>
      )}
      <div className="price-lines__total">
        <dt>{t.booking.total}</dt>
        <dd>{money(pricing.total)}</dd>
      </div>
    </dl>
  );
}

/**
 * Shown when no genuine room can be booked online for the stay: the guest sends the hotel a request through the
 * contact form (POST /contact-messages), prefilled with the dates and guests.
 */
function StayRequest({ result }: { result: AvailabilityResult }) {
  const { t, lang } = useI18n();
  const { hotel } = useHotel();
  const from = formatDay(result.checkIn, lang);
  const to = formatDay(result.checkOut, lang);
  const guests = [t.common.adults(result.adults), result.children > 0 ? t.common.children(result.children) : null].filter(Boolean).join(", ");
  const query = new URLSearchParams({
    subject: t.booking.requestSubject(from, to),
    message: t.booking.requestMessage(from, to, t.common.nights(result.nights), guests),
  });
  return (
    <div className="stay-request">
      <h4 className="display-3">{t.booking.requestTitle}</h4>
      <p>{t.booking.requestText}</p>
      <Link to={`/contact?${query.toString()}#contact-form`} className="button button--primary">
        {t.booking.requestCta}
      </Link>
      <p className="stay-request__or">
        {t.booking.requestOr} <a href={telHref(hotel.phone)}>{hotel.phone}</a>, <a href={`mailto:${hotel.email}`}>{hotel.email}</a>
      </p>
    </div>
  );
}

export function BookingPage() {
  const { t, lang } = useI18n();
  const { hotel, settings } = useHotel();
  const { search: params, navigate } = useRouter();
  useDocumentTitle(t.booking.title);

  const today = todayISO();
  const [search, setSearch] = useState<Search>(() => searchFromUrl(params, today));
  const [searchErrors, setSearchErrors] = useState<Errors>({});
  const [step, setStep] = useState<Step>("search");
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [selected, setSelected] = useState<AvailabilityRoom | null>(null);
  const [guest, setGuest] = useState<GuestInput>(EMPTY_GUEST);
  const [guestErrors, setGuestErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<{ tone: "error" | "warning"; text: string } | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const searching = useSubmit();
  const submitting = useSubmit();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Move keyboard / screen-reader focus to the new step's heading.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const runSearch = async (query: Search, keepNotice = false) => {
    const found = validateSearch(query, t, { today, maxStayNights: hotel.maxStayNights });
    setSearchErrors(found);
    if (!keepNotice) setNotice(null);
    if (Object.keys(found).length > 0) {
      setStep("search");
      return;
    }
    await searching.run(async () => {
      try {
        const data = await api.availability(query);
        setResult(data);
        setSelected(null);
        setStep("results");
        const q = new URLSearchParams({ checkIn: query.checkIn, checkOut: query.checkOut, adults: String(query.adults), children: String(query.children) });
        if (query.roomType) q.set("roomType", query.roomType);
        if (query.roomId) q.set("roomId", query.roomId);
        navigate(`/booking?${q.toString()}`, { replace: true, keepScroll: true });
      } catch (error) {
        setStep("search");
        if (error instanceof ApiError && error.code === "VALIDATION_ERROR") setSearchErrors(fieldErrorsFrom(error));
        setNotice({ tone: "error", text: errorMessage(error, t) });
      }
    });
  };

  // Arriving from the booking bar or a room page with dates: search straight away.
  useEffect(() => {
    if (params.get("checkIn") && params.get("checkOut")) void runSearch(search);
    // Only on first display.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGuestSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !result) return;
    const found = validateGuest(guest, t);
    setGuestErrors(found);
    setNotice(null);
    if (Object.keys(found).length > 0) return;

    await submitting.run(async () => {
      const outcome = await submitBooking(api.createBooking, bookingRequest(result, selected, guest));
      if (outcome.kind === "booked") {
        // Only a 201 answer from the backend gets here: the request really exists.
        setBooking(outcome.booking);
        setStep("done");
      } else if (outcome.kind === "room") {
        const code = outcome.error instanceof ApiError ? outcome.error.code : "";
        setNotice({ tone: "warning", text: code === "ROOM_UNAVAILABLE" ? t.booking.unavailableAgain : errorMessage(outcome.error, t) });
        await runSearch(search, true);
      } else if (outcome.kind === "dates") {
        setStep("search");
        setNotice({ tone: "error", text: errorMessage(outcome.error, t) });
      } else {
        setGuestErrors(outcome.fieldErrors);
        setNotice({ tone: "error", text: errorMessage(outcome.error, t) });
      }
    });
  };

  const restart = () => {
    setBooking(null);
    setSelected(null);
    setGuest(EMPTY_GUEST);
    setNotice(null);
    setStep("search");
  };

  const stepIndex = { search: 0, results: 1, guest: 2, done: 3 }[step];
  const stepTitle = t.booking.steps[stepIndex];

  if (settings && !settings.isBookingEnabled) {
    return (
      <section className="booking">
        <h1 className="display-1">{t.booking.title}</h1>
        <Notice tone="warning">{t.booking.disabled}</Notice>
        <p className="booking__contact">
          <a href={telHref(hotel.phone)}>{hotel.phone}</a>
          <a href={`mailto:${hotel.email}`}>{hotel.email}</a>
        </p>
      </section>
    );
  }

  const guestsText = [t.common.adults(search.adults), search.children > 0 ? t.common.children(search.children) : null].filter(Boolean).join(", ");
  // Backend demo records are never offered to guests (they have no genuine price or availability).
  const views = (result?.rooms ?? []).filter((entry) => !isDemoRoom(entry.room)).map((entry, i) => ({ entry, view: roomView(entry.room, i, t) }));
  const noneAvailable = views.every(({ entry }) => !entry.available);
  const filtered = Boolean(search.roomId || search.roomType);

  return (
    <section className="booking" aria-labelledby="booking-step">
      <header className="booking__head">
        <h1 className="display-1">{t.booking.title}</h1>
        <p className="lead">{t.booking.lead}</p>
        <ol className="steps" aria-label={t.booking.stepLabel(stepIndex + 1, 4, stepTitle)}>
          {t.booking.steps.map((name, i) => (
            <li key={name} className={i === stepIndex ? "is-current" : i < stepIndex ? "is-done" : ""} aria-current={i === stepIndex ? "step" : undefined}>
              <span className="steps__number">{i + 1}</span>
              <span className="steps__name">{name}</span>
            </li>
          ))}
        </ol>
      </header>

      <h2 id="booking-step" ref={headingRef} tabIndex={-1} className="visually-hidden">
        {t.booking.stepLabel(stepIndex + 1, 4, stepTitle)}
      </h2>

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      {step !== "done" && (
        <form
          className={`stay-form ${step === "search" ? "" : "stay-form--compact"}`}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void runSearch(search);
          }}
        >
          <TextField
            label={t.booking.checkIn}
            type="date"
            min={today}
            value={search.checkIn}
            error={searchErrors.checkIn}
            onChange={(e) => {
              const value = e.target.value;
              setSearch((s) => ({ ...s, checkIn: value, checkOut: value && value >= s.checkOut ? addDays(value, 1) : s.checkOut }));
            }}
            required
          />
          <TextField
            label={t.booking.checkOut}
            type="date"
            min={addDays(search.checkIn || today, 1)}
            value={search.checkOut}
            error={searchErrors.checkOut}
            onChange={(e) => setSearch((s) => ({ ...s, checkOut: e.target.value }))}
            required
          />
          <TextField
            label={t.booking.adults}
            type="number"
            min={1}
            max={10}
            inputMode="numeric"
            value={String(search.adults)}
            error={searchErrors.adults}
            onChange={(e) => setSearch((s) => ({ ...s, adults: e.target.value === "" ? Number.NaN : Number(e.target.value) }))}
          />
          <TextField
            label={t.booking.children}
            type="number"
            min={0}
            max={10}
            inputMode="numeric"
            value={String(search.children)}
            error={searchErrors.children}
            onChange={(e) => setSearch((s) => ({ ...s, children: e.target.value === "" ? Number.NaN : Number(e.target.value) }))}
          />
          <button type="submit" className="button button--primary stay-form__submit" disabled={searching.pending} aria-busy={searching.pending}>
            {searching.pending ? t.booking.searching : t.booking.search}
          </button>
        </form>
      )}

      {step === "results" && result && (
        <div className="results">
          <div className="results__head">
            <h3 className="display-3">{views.length > 0 ? t.booking.resultsTitle : t.booking.yourStay}</h3>
            <p>
              {formatRange(result.checkIn, result.checkOut, lang)}, {t.booking.resultsSummary(t.common.nights(result.nights), guestsText)}
            </p>
            {filtered && (
              <button type="button" className="text-link text-link--button" onClick={() => {
                const all = { ...search, roomId: undefined, roomType: undefined };
                setSearch(all);
                void runSearch(all);
              }}>
                {t.booking.showAll}
              </button>
            )}
          </div>
          {views.length > 0 && (
          <ul className="result-list">
            {views.map(({ entry, view }) => (
              <li key={entry.room.id} className={`result ${entry.available ? "" : "result--soldout"}`}>
                <Photo photo={view.photos[0]} alt="" className="result__photo ratio-3x2" />
                <div className="result__body">
                  <p className="room-card__type">{view.typeLabel}</p>
                  <h4 className="display-4">{view.name}</h4>
                  <p className="result__meta">{t.common.upTo(entry.room.capacity)}</p>
                  <p className={entry.available ? "result__availability" : "result__availability result__availability--none"}>
                    {entry.available ? t.booking.available(entry.remainingUnits) : t.booking.soldOut}
                  </p>
                </div>
                <div className="result__price">
                  <p className="result__total">{formatMoney(entry.pricing.total, entry.pricing.currency, lang)}</p>
                  <p className="result__total-label">
                    {t.booking.priceTotal}, {t.common.nights(entry.pricing.nights)}
                  </p>
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={!entry.available}
                    onClick={() => {
                      setSelected(entry);
                      setNotice(null);
                      setStep("guest");
                    }}
                  >
                    {t.booking.select}
                    <span className="visually-hidden">: {view.name}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
          )}
          {noneAvailable && <StayRequest result={result} />}
        </div>
      )}

      {step === "guest" && selected && result && (
        <div className="checkout">
          <form className="form checkout__form" onSubmit={handleGuestSubmit} noValidate>
            <h3 className="display-3">{t.booking.guestTitle}</h3>
            <div className="form__row">
              <TextField label={t.booking.firstName} autoComplete="given-name" value={guest.firstName} onChange={(e) => setGuest((g) => ({ ...g, firstName: e.target.value }))} error={guestErrors.firstName} required maxLength={80} />
              <TextField label={t.booking.lastName} autoComplete="family-name" value={guest.lastName} onChange={(e) => setGuest((g) => ({ ...g, lastName: e.target.value }))} error={guestErrors.lastName} required maxLength={80} />
            </div>
            <div className="form__row">
              <TextField label={t.booking.email} type="email" autoComplete="email" value={guest.email} onChange={(e) => setGuest((g) => ({ ...g, email: e.target.value }))} error={guestErrors.email} required />
              <TextField label={t.booking.phone} type="tel" autoComplete="tel" hint={t.booking.phoneHint} value={guest.phone} onChange={(e) => setGuest((g) => ({ ...g, phone: e.target.value }))} error={guestErrors.phone} required />
            </div>
            <TextArea label={t.booking.requests} hint={t.booking.requestsHint} optional rows={4} maxLength={1000} value={guest.specialRequests} onChange={(e) => setGuest((g) => ({ ...g, specialRequests: e.target.value }))} error={guestErrors.specialRequests} />
            <p className="form__note">{t.booking.consent}</p>
            <div className="form__actions">
              <button type="button" className="button button--ghost" onClick={() => setStep("results")} disabled={submitting.pending}>
                {t.common.back}
              </button>
              <button type="submit" className="button button--primary" disabled={submitting.pending} aria-busy={submitting.pending}>
                {submitting.pending ? t.booking.submitting : t.booking.submit}
              </button>
            </div>
          </form>

          <aside className="checkout__summary" aria-label={t.booking.yourStay}>
            <h3 className="display-4">{t.booking.yourStay}</h3>
            <p className="checkout__room">{roomView(selected.room, 0, t).name}</p>
            <p>{formatRange(result.checkIn, result.checkOut, lang)}</p>
            <p>{guestsText}</p>
            {hotel.checkInTime && hotel.checkOutTime && (
              <p className="checkout__times">
                {t.booking.checkInFrom(hotel.checkInTime)}, {t.booking.checkOutUntil(hotel.checkOutTime).toLowerCase()}
              </p>
            )}
            <h4 className="checkout__subtitle">{t.booking.priceBreakdown}</h4>
            <PriceLines pricing={selected.pricing} />
            <p className="checkout__note">{t.booking.priceNote}</p>
            {hotel.cancellationPolicy && (
              <>
                <h4 className="checkout__subtitle">{t.booking.cancellationTitle}</h4>
                <p className="checkout__note">{hotel.cancellationPolicy}</p>
              </>
            )}
          </aside>
        </div>
      )}

      {step === "done" && booking && (
        <div className="confirmation">
          <h3 className="display-2">{t.booking.successTitle}</h3>
          <p className="lead">{t.booking.successText}</p>
          <dl className="summary-list summary-list--wide">
            <div>
              <dt>{t.booking.reference}</dt>
              <dd className="confirmation__reference">{booking.reference}</dd>
            </div>
            <div>
              <dt>{t.booking.status}</dt>
              <dd>{t.booking.statuses[booking.status]}</dd>
            </div>
            <div>
              <dt>{t.manage.room}</dt>
              <dd>{selected ? roomView(selected.room, 0, t).name : booking.roomName}</dd>
            </div>
            <div>
              <dt>{t.manage.dates}</dt>
              <dd>{formatRange(booking.checkIn, booking.checkOut, lang)}</dd>
            </div>
            <div>
              <dt>{t.manage.total}</dt>
              <dd>{formatMoney(booking.pricing.total, booking.pricing.currency, lang)}</dd>
            </div>
          </dl>
          <p className="form__note">{t.booking.referenceHint}</p>
          <div className="form__actions">
            <Link to={`/booking/manage?reference=${booking.reference}`} className="button button--primary">
              {t.booking.trackLink}
            </Link>
            <button type="button" className="button button--ghost" onClick={restart}>
              {t.booking.newSearch}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
