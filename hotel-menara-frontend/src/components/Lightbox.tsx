import { useEffect, useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useI18n } from "../i18n/LanguageContext";
import type { GalleryEntry } from "../lib/hotel";
import { Photo } from "./Photo";

interface LightboxProps {
  entries: GalleryEntry[];
  index: number | null;
  onChange: (index: number | null) => void;
}

/** Full-screen photo viewer: arrows / swipe to move, Escape or the close button to leave. */
export function Lightbox({ entries, index, onChange }: LightboxProps) {
  const { t } = useI18n();
  const open = index !== null && entries[index] !== undefined;
  const ref = useFocusTrap<HTMLDivElement>(open, () => onChange(null));
  const touchX = useRef<number | null>(null);
  const count = entries.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") onChange(((index ?? 0) + 1) % count);
      if (event.key === "ArrowLeft") onChange(((index ?? 0) - 1 + count) % count);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, index, count, onChange]);

  if (!open || index === null) return null;
  const entry = entries[index];
  const go = (delta: number) => onChange((index + delta + count) % count);

  return (
    <div
      ref={ref}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={t.gallery.dialog}
      onClick={(event) => {
        if (event.target === event.currentTarget) onChange(null);
      }}
      onTouchStart={(event) => {
        touchX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchX.current;
        const end = event.changedTouches[0]?.clientX;
        if (start !== null && end !== undefined && Math.abs(end - start) > 50) go(end < start ? 1 : -1);
        touchX.current = null;
      }}
    >
      <button type="button" className="lightbox__close" onClick={() => onChange(null)} data-autofocus>
        {t.common.close}
      </button>
      <figure className="lightbox__figure" key={entry.key}>
        <Photo photo={entry.photo} alt={entry.title} className="lightbox__photo" priority />
        <figcaption className="lightbox__caption">
          <span>{entry.caption ?? entry.title}</span>
          <span className="lightbox__count" aria-live="polite">
            {t.gallery.counter(index + 1, count)}
          </span>
        </figcaption>
      </figure>
      {count > 1 && (
        <>
          <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => go(-1)} aria-label={t.gallery.previous}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => go(1)} aria-label={t.gallery.next}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
