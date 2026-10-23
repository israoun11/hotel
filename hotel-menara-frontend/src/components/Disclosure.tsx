import { useId, useState, type ReactNode } from "react";

/** Expand / collapse panel (used for the spa rituals). The height animation is pure CSS. */
export function Disclosure({ summary, meta, children, defaultOpen = false }: { summary: ReactNode; meta?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={`disclosure ${open ? "is-open" : ""}`}>
      <h3 className="disclosure__heading">
        <button type="button" className="disclosure__button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
          <span className="disclosure__summary">{summary}</span>
          {meta && <span className="disclosure__meta">{meta}</span>}
          <span className="disclosure__icon" aria-hidden="true" />
        </button>
      </h3>
      <div id={id} className="disclosure__panel" role="region" aria-hidden={!open}>
        <div className="disclosure__inner">{children}</div>
      </div>
    </div>
  );
}
