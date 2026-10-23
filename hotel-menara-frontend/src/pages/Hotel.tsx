import { PageIntro } from "../components/PageIntro";
import { Photo } from "../components/Photo";
import { Reveal } from "../components/Reveal";
import { PHOTOS } from "../content/photos";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useI18n } from "../i18n/LanguageContext";
import { Link } from "../router/Router";

export function HotelPage() {
  const { t } = useI18n();
  useDocumentTitle(t.hotel.title);
  return (
    <>
      <PageIntro title={t.hotel.title} lead={t.hotel.lead} photo={PHOTOS.hotel[1]} photoAlt={t.gallery.hotelPhoto} />

      <section className="prose-split">
        <Reveal className="prose-split__text">
          {t.hotel.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <Link to="/rooms" className="text-link">
            {t.home.roomsLink}
          </Link>
        </Reveal>
        <Reveal className="prose-split__media">
          <Photo photo={PHOTOS.hotel[2]} alt={t.gallery.hotelPhoto} className="ratio-4x5" />
        </Reveal>
      </section>

      <section className="eco">
        <div className="eco__inner">
          <Reveal className="eco__head">
            <h2 className="display-2">{t.hotel.ecoTitle}</h2>
            <p className="lead">{t.hotel.ecoLead}</p>
          </Reveal>
          <ul className="eco__pillars">
            {t.hotel.ecoPillars.map((pillar) => (
              <li key={pillar.title}>
                <h3 className="display-4">{pillar.title}</h3>
                <p>{pillar.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
