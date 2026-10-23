import { api } from "../api";
import { PageIntro } from "../components/PageIntro";
import { Photo } from "../components/Photo";
import { Reveal } from "../components/Reveal";
import { PHOTOS } from "../content/photos";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useI18n } from "../i18n/LanguageContext";
import { publicServices } from "../lib/hotel";

export function ServicesPage() {
  const { t } = useI18n();
  const services = useApi("services", api.services);
  useDocumentTitle(t.services.title);
  // Only real services added by the hotel in the admin are listed; demo placeholders and loading errors stay silent
  // because the official service list above is complete on its own.
  const extra = publicServices(services.data ?? []);

  return (
    <>
      <PageIntro title={t.services.title} lead={t.services.lead} photo={PHOTOS.hotel[0]} photoAlt={t.gallery.hotelPhoto} />
      <section className="service-groups">
        {t.services.groups.map((group) => (
          <Reveal key={group.title} className="service-group">
            <h2 className="display-4">{group.title}</h2>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>
        ))}
      </section>

      {extra.length > 0 && (
        <section className="service-extra" aria-labelledby="extra-title">
          <h2 id="extra-title" className="display-2">
            {t.services.moreTitle}
          </h2>
          <ul className="service-extra__list">
            {extra.map((s) => (
              <li key={s.id}>
                <p className="service-extra__category">{t.services.categories[s.category]}</p>
                <h3 className="display-4">{s.name}</h3>
                <p>{s.description}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="wide-photo">
        <Photo photo={PHOTOS.hotel[3]} alt={t.gallery.hotelPhoto} className="ratio-21x9" />
      </section>
    </>
  );
}
