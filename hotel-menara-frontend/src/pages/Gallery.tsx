import { useMemo, useState } from "react";
import { api } from "../api";
import { Notice } from "../components/Feedback";
import { Lightbox } from "../components/Lightbox";
import { Photo } from "../components/Photo";
import { useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useI18n } from "../i18n/LanguageContext";
import { buildGallery, type GalleryFilter } from "../lib/hotel";

export function GalleryPage() {
  const { t } = useI18n();
  const gallery = useApi("gallery", api.gallery);
  const [filter, setFilter] = useState<GalleryFilter | "all">("all");
  const [open, setOpen] = useState<number | null>(null);
  useDocumentTitle(t.gallery.title);

  // Official photos are always shown; real backend gallery items are added once loaded.
  const entries = useMemo(() => buildGallery(gallery.data ?? [], t), [gallery.data, t]);
  const filters = useMemo(() => {
    const present = new Set(entries.map((e) => e.category));
    return (Object.keys(t.gallery.categories) as GalleryFilter[]).filter((key) => present.has(key));
  }, [entries, t]);
  const visible = filter === "all" ? entries : entries.filter((e) => e.category === filter);

  return (
    <section className="gallery-page">
      <header className="gallery-page__head">
        <h1 className="display-1">{t.gallery.title}</h1>
        <p className="lead">{t.gallery.lead}</p>
      </header>

      <div className="filter-bar" role="group" aria-label={t.gallery.title}>
        {(["all", ...filters] as const).map((key) => (
          <button key={key} type="button" className="filter-bar__item" aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {key === "all" ? t.gallery.all : t.gallery.categories[key]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Notice>{t.gallery.empty}</Notice>
      ) : (
        <ul className="gallery-grid">
          {visible.map((entry, i) => (
            <li key={entry.key} className={`gallery-grid__item gallery-grid__item--${i % 7}`}>
              <button type="button" onClick={() => setOpen(i)} aria-label={t.gallery.open(entry.caption ?? entry.title)}>
                <Photo photo={entry.photo} alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Lightbox entries={visible} index={open} onChange={setOpen} />
    </section>
  );
}
