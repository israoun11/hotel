import { useEffect, useState, type CSSProperties } from "react";
import type { Photo as PhotoData } from "../content/photos";

interface PhotoProps {
  photo: PhotoData;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  style?: CSSProperties;
}

/**
 * Image with graceful failure: tries each source in turn, then shows a quiet branded panel instead of a broken image.
 * `alt=""` marks a decorative picture.
 */
export function Photo({ photo, alt, className = "", sizes, priority = false, style }: PhotoProps) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const key = photo.sources.join("|");

  useEffect(() => {
    setIndex(0);
    setLoaded(false);
  }, [key]);

  const src = photo.sources[index];
  if (!src) {
    return (
      <span className={`photo photo--fallback ${className}`} style={style} role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
        <img src="/brand/logo-dark.png" alt="" className="photo__mark" />
      </span>
    );
  }
  return (
    <span className={`photo ${loaded ? "is-loaded" : ""} ${className}`} style={style}>
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        {...(priority ? { fetchpriority: "high" } : {})}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false);
          setIndex((i) => i + 1);
        }}
      />
    </span>
  );
}
