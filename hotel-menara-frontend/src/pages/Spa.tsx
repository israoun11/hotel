import { Disclosure } from "../components/Disclosure";
import { PageIntro } from "../components/PageIntro";
import { Photo } from "../components/Photo";
import { Reveal } from "../components/Reveal";
import { PHOTOS } from "../content/photos";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useI18n } from "../i18n/LanguageContext";
import { Link } from "../router/Router";

export function SpaPage() {
  const { t } = useI18n();
  useDocumentTitle(t.spa.title);
  return (
    <>
      <PageIntro title={t.spa.title} lead={t.spa.lead} photo={PHOTOS.spa[1]} photoAlt={t.gallery.spaPhoto} />

      <section className="spa-story">
        <Reveal className="spa-story__media">
          <Photo photo={PHOTOS.spa[3]} alt={t.gallery.spaPhoto} className="ratio-4x5" />
        </Reveal>
        <Reveal className="spa-story__text">
          {t.spa.paragraphs.map((p) => (
            <p key={p} className="lead">
              {p}
            </p>
          ))}
        </Reveal>
        <Reveal className="spa-story__media spa-story__media--small">
          <Photo photo={PHOTOS.spa[4]} alt={t.gallery.spaPhoto} className="ratio-1x1" />
        </Reveal>
      </section>

      <section className="rituals" aria-labelledby="rituals-title">
        <div className="rituals__inner">
          <div className="section-head section-head--light">
            <h2 id="rituals-title" className="display-2">
              {t.spa.ritualsTitle}
            </h2>
            <p>{t.spa.ritualsLead}</p>
          </div>
          <div className="rituals__list">
            {t.spa.rituals.map((ritual, i) => (
              <Disclosure key={ritual.name} summary={ritual.name} meta={t.spa.duration(ritual.days.length)} defaultOpen={i === 0}>
                <ol className="ritual-days">
                  {ritual.days.map((steps, d) => (
                    <li key={d}>
                      <h4 className="ritual-days__label">{t.spa.day(d + 1)}</h4>
                      <ul>
                        {steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </Disclosure>
            ))}
          </div>
          <p className="rituals__ask">
            {t.spa.ask}{" "}
            <Link to="/contact" className="text-link text-link--light">
              {t.spa.askLink}
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
