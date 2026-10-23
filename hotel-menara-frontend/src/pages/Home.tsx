import { useEffect, useState } from "react";
import { BookingBar } from "../components/BookingBar";
import { Photo } from "../components/Photo";
import { Reveal } from "../components/Reveal";
import { PHOTOS } from "../content/photos";
import { useHotel } from "../context/HotelContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useI18n } from "../i18n/LanguageContext";
import { Link } from "../router/Router";

const HERO = [PHOTOS.hotel[0], PHOTOS.hotel[1], PHOTOS.hotel[2]];
const SLIDE_MS = 7000;

function Hero() {
  const { t } = useI18n();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % HERO.length), SLIDE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__media" role="img" aria-label={t.home.heroSlides}>
        {HERO.map((photo, i) => (
          <Photo key={photo.id} photo={photo} alt="" priority={i === 0} className={`hero__slide ${i === active ? "is-active" : ""}`} />
        ))}
        <span className="hero__shade" aria-hidden="true" />
      </div>
      <div className="hero__content">
        <div className="hero__frame">
          <h1 id="hero-title" className="hero__title">
            <span className="hero__name">{t.home.heroTitle}</span>
            <span className="hero__line">{t.home.heroLine}</span>
          </h1>
          <p className="hero__text">{t.home.heroText}</p>
          <div className="hero__actions">
            <Link to="/booking" className="button button--light">
              {t.home.heroBook}
            </Link>
            <Link to="/rooms" className="button button--outline-light">
              {t.home.heroExplore}
            </Link>
          </div>
        </div>
      </div>
      <div className="hero__bar">
        <BookingBar />
      </div>
    </section>
  );
}

export function HomePage() {
  const { t } = useI18n();
  const { hotel } = useHotel();
  useDocumentTitle();

  return (
    <>
      <Hero />

      <section className="home-intro">
        <Reveal className="home-intro__inner">
          <h2 className="display-2">{t.home.introTitle}</h2>
          <div className="home-intro__body">
            <p className="lead">{t.home.introText}</p>
            <ul className="fact-line" aria-label={hotel.name}>
              {t.home.introFacts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
            <Link to="/hotel" className="text-link">
              {t.home.introLink}
            </Link>
          </div>
        </Reveal>
      </section>

      <section className="home-rooms">
        <Reveal className="home-rooms__media frame frame--offset">
          <Photo photo={PHOTOS.rooms[0]} alt={t.gallery.roomPhoto} className="ratio-4x5" />
        </Reveal>
        <Reveal className="home-rooms__text">
          <h2 className="display-2">{t.home.roomsTitle}</h2>
          <p>{t.home.roomsText}</p>
          <ul className="category-list">
            {t.rooms.categories.map((c) => (
              <li key={c.name}>
                <span>{c.name}</span>
                <span className="category-list__meta">{c.beds}</span>
              </li>
            ))}
          </ul>
          <Link to="/rooms" className="button button--primary">
            {t.home.roomsLink}
          </Link>
        </Reveal>
        <Reveal className="home-rooms__second">
          <Photo photo={PHOTOS.rooms[1]} alt={t.gallery.roomPhoto} className="ratio-3x2" />
        </Reveal>
      </section>

      <section className="home-spa">
        <div className="home-spa__media">
          <Photo photo={PHOTOS.spa[0]} alt={t.gallery.spaPhoto} />
        </div>
        <Reveal className="home-spa__text">
          <h2 className="display-2">{t.home.spaTitle}</h2>
          <p>{t.home.spaText}</p>
          <Link to="/spa" className="button button--outline-light">
            {t.home.spaLink}
          </Link>
        </Reveal>
      </section>

      <section className="home-gallery" aria-labelledby="home-gallery-title">
        <div className="home-gallery__head">
          <h2 id="home-gallery-title" className="display-2">
            {t.home.galleryTitle}
          </h2>
          <Link to="/gallery" className="text-link">
            {t.home.galleryLink}
          </Link>
        </div>
        <Reveal className="home-gallery__grid">
          <Photo photo={PHOTOS.hotel[3]} alt={t.gallery.hotelPhoto} className="home-gallery__a" />
          <Photo photo={PHOTOS.spa[2]} alt={t.gallery.spaPhoto} className="home-gallery__b" />
          <Photo photo={PHOTOS.rooms[3]} alt={t.gallery.roomPhoto} className="home-gallery__c" />
          <Photo photo={PHOTOS.hotel[1]} alt={t.gallery.hotelPhoto} className="home-gallery__d" />
        </Reveal>
      </section>

      <section className="home-visit">
        <Reveal className="home-visit__inner">
          <h2 className="display-2">{t.home.visitTitle}</h2>
          <p>{t.home.visitText}</p>
          <div className="home-visit__actions">
            <a className="button button--primary" href={hotel.mapUrl} target="_blank" rel="noopener noreferrer">
              {t.home.visitMap}
            </a>
            <Link to="/contact" className="button button--ghost">
              {t.home.visitContact}
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
