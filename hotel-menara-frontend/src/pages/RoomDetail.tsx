import { useState } from "react";
import { api } from "../api";
import { ApiError } from "../api/client";
import { LoadError, Loading } from "../components/Feedback";
import { Lightbox } from "../components/Lightbox";
import { Photo } from "../components/Photo";
import { useHotel } from "../context/HotelContext";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useI18n } from "../i18n/LanguageContext";
import { formatMoney } from "../lib/format";
import { publicRooms, roomView } from "../lib/hotel";
import { Link } from "../router/Router";

export function RoomDetailPage({ slug }: { slug: string }) {
  const { t, lang } = useI18n();
  const { hotel } = useHotel();
  const room = useApi(`room:${slug}`, () => api.room(slug));
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  // Backend demo records and hidden rooms are never presented as real rooms.
  const genuine = room.data && publicRooms([room.data]).length === 1 ? room.data : undefined;
  const view = genuine ? roomView(genuine, 0, t) : undefined;
  useDocumentTitle(view?.name ?? t.rooms.title);

  if (room.loading) return <div className="container-narrow"><Loading /></div>;
  if (room.error !== undefined && !(room.error instanceof ApiError && room.error.status === 404)) {
    return (
      <div className="container-narrow page-pad">
        <LoadError error={room.error} onRetry={room.reload} />
      </div>
    );
  }
  if (!view) {
    return (
      <section className="not-found">
        <h1 className="display-1">{t.rooms.title}</h1>
        <p className="lead">{room.data ? t.rooms.unavailable : t.rooms.notFound}</p>
        <div className="form__actions">
          <Link to="/rooms" className="button button--primary">
            {t.rooms.allRooms}
          </Link>
          <Link to="/booking" className="button button--ghost">
            {t.rooms.requestBook}
          </Link>
        </div>
      </section>
    );
  }

  const entries = view.photos.map((photo, i) => ({ key: photo.id, photo, title: t.rooms.photo(view.name, i + 1), category: "rooms" as const }));

  return (
    <article className="room-detail">
      <nav className="breadcrumb" aria-label={t.rooms.allRooms}>
        <Link to="/rooms">{t.rooms.allRooms}</Link>
      </nav>
      <header className="room-detail__head">
        <p className="room-card__type">{view.typeLabel}</p>
        <h1 className="display-1">{view.name}</h1>
      </header>

      <div className="room-detail__gallery">
        {view.photos.slice(0, 3).map((photo, i) => (
          <button key={photo.id} type="button" className={`room-detail__shot room-detail__shot--${i}`} onClick={() => setPhotoIndex(i)} aria-label={t.gallery.open(t.rooms.photo(view.name, i + 1))}>
            <Photo photo={photo} alt="" priority={i === 0} />
          </button>
        ))}
      </div>

      <div className="room-detail__body">
        <div className="room-detail__text">
          <p className="lead">{view.description}</p>
          <h2 className="display-4">{t.rooms.amenities}</h2>
          <ul className="feature-list">
            {view.amenities.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
        <aside className="room-detail__aside" aria-label={t.booking.yourStay}>
          <dl className="summary-list">
            <div>
              <dt>{t.rooms.capacity}</dt>
              <dd>{t.common.upTo(view.room.capacity)}</dd>
            </div>
            <div>
              <dt>{t.booking.nightlyRate}</dt>
              <dd>{formatMoney(view.room.pricePerNight, hotel.currency, lang)}</dd>
            </div>
            {hotel.checkInTime && (
              <div>
                <dt>{t.booking.checkIn}</dt>
                <dd>{t.booking.checkInFrom(hotel.checkInTime)}</dd>
              </div>
            )}
            {hotel.checkOutTime && (
              <div>
                <dt>{t.booking.checkOut}</dt>
                <dd>{t.booking.checkOutUntil(hotel.checkOutTime)}</dd>
              </div>
            )}
          </dl>
          <Link to={`/booking?roomId=${view.room.id}`} className="button button--primary button--block">
            {t.rooms.bookThis}
          </Link>
        </aside>
      </div>
      <Lightbox entries={entries} index={photoIndex} onChange={setPhotoIndex} />
    </article>
  );
}
