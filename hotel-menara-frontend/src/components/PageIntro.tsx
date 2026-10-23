import type { ReactNode } from "react";
import type { Photo as PhotoData } from "../content/photos";
import { Photo } from "./Photo";

/** Opening of an inner page: title and lead on the left, an optional framed photograph on the right. */
export function PageIntro({ title, lead, photo, photoAlt = "", children }: { title: string; lead?: string; photo?: PhotoData; photoAlt?: string; children?: ReactNode }) {
  return (
    <section className={`page-intro ${photo ? "page-intro--photo" : ""}`}>
      <div className="page-intro__text">
        <h1 className="page-intro__title">{title}</h1>
        {lead && <p className="page-intro__lead">{lead}</p>}
        {children}
      </div>
      {photo && (
        <div className="page-intro__media frame">
          <Photo photo={photo} alt={photoAlt} priority className="page-intro__photo" />
        </div>
      )}
    </section>
  );
}
