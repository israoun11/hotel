import { api } from "../api";
import { PageIntro } from "../components/PageIntro";
import { Photo } from "../components/Photo";
import { Reveal } from "../components/Reveal";
import { PHOTOS } from "../content/photos";
import { useHotel } from "../context/HotelContext";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useI18n } from "../i18n/LanguageContext";
import { formatMoney } from "../lib/format";
import { publicRooms, roomView } from "../lib/hotel";
import { Link } from "../router/Router";

export function RoomsPage() {
  const { t, lang } = useI18n();
  const { hotel } = useHotel();
  const rooms = useApi("rooms", api.rooms);
  useDocumentTitle(t.rooms.title);

  const views = publicRooms(rooms.data ?? []).map((room, i) => roomView(room, i, t));

  return (
    <>
      <PageIntro title={t.rooms.title} lead={t.rooms.lead} photo={PHOTOS.rooms[2]} photoAlt={t.gallery.roomPhoto} />

      <section className="room-facts">
        <Reveal className="room-facts__inner">
          <div className="room-facts__size">
            <p className="room-facts__label">{t.rooms.sizeLabel}</p>
            <p className="room-facts__value">{t.rooms.size}</p>
          </div>
          <div>
            <h2 className="display-4">{t.rooms.featuresTitle}</h2>
            <ul className="feature-list">
              {t.rooms.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="display-4">{t.rooms.categoriesTitle}</h2>
            <ul className="category-list">
              {t.rooms.categories.map((c) => (
                <li key={c.name}>
                  <span>{c.name}</span>
                  <span className="category-list__meta">{c.beds}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {views.length > 0 ? (
        <section className="room-list" aria-labelledby="bookable-title">
          <div className="section-head">
            <h2 id="bookable-title" className="display-2">
              {t.rooms.bookableTitle}
            </h2>
            <p>{t.rooms.bookableLead}</p>
          </div>
          <ul className="room-cards">
            {views.map((view, i) => (
              <li key={view.room.id}>
                <Reveal className={`room-card ${i % 2 === 1 ? "room-card--flip" : ""}`}>
                  <Link to={`/rooms/${view.room.slug}`} className="room-card__media" tabIndex={-1} aria-hidden="true">
                    <Photo photo={view.photos[0]} alt="" className="ratio-3x2" />
                  </Link>
                  <div className="room-card__body">
                    <p className="room-card__type">{view.typeLabel}</p>
                    <h3 className="display-3">
                      <Link to={`/rooms/${view.room.slug}`}>{view.name}</Link>
                    </h3>
                    <p>{view.description}</p>
                    <p className="room-card__meta">
                      <span>{t.common.upTo(view.room.capacity)}</span>
                      <span>{t.rooms.fromPrice(formatMoney(view.room.pricePerNight, hotel.currency, lang))}</span>
                    </p>
                    <div className="room-card__actions">
                      <Link to={`/rooms/${view.room.slug}`} className="button button--ghost">
                        {t.rooms.details}
                      </Link>
                      <Link to={`/booking?roomId=${view.room.id}`} className="text-link">
                        {t.rooms.bookThis}
                      </Link>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        !rooms.loading && (
          // No genuine room published yet (or the list could not be loaded): invite the guest to book or write instead.
          <section className="room-invite">
            <Reveal className="room-invite__inner">
              <div className="room-invite__media frame">
                <Photo photo={PHOTOS.rooms[3]} alt={t.gallery.roomPhoto} className="ratio-3x2" />
              </div>
              <div className="room-invite__text">
                <h2 className="display-2">{t.rooms.requestTitle}</h2>
                <p className="lead">{t.rooms.requestText}</p>
                <div className="room-invite__actions">
                  <Link to="/booking" className="button button--primary">
                    {t.rooms.requestBook}
                  </Link>
                  <Link to="/contact" className="button button--ghost">
                    {t.rooms.requestWrite}
                  </Link>
                </div>
              </div>
            </Reveal>
          </section>
        )
      )}
    </>
  );
}
