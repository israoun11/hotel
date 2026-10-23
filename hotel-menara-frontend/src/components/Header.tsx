import { useEffect, useState } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useI18n } from "../i18n/LanguageContext";
import { useHotel } from "../context/HotelContext";
import { telHref } from "../lib/hotel";
import { isActivePath } from "../lib/navigation";
import { Link, useRouter } from "../router/Router";

export function useNavItems() {
  const { t } = useI18n();
  return [
    { to: "/hotel", label: t.nav.hotel },
    { to: "/rooms", label: t.nav.rooms },
    { to: "/services", label: t.nav.services },
    { to: "/spa", label: t.nav.spa },
    { to: "/gallery", label: t.nav.gallery },
    { to: "/contact", label: t.nav.contact },
  ];
}

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <button
      type="button"
      className={`lang-switch ${className}`}
      onClick={() => setLang(lang === "fr" ? "en" : "fr")}
      aria-label={t.common.switchLanguageLabel}
      lang={lang === "fr" ? "en" : "fr"}
    >
      {t.common.switchLanguage}
    </button>
  );
}

/** `overlay`: transparent header drawn over a full-screen photo (home page) until the page is scrolled. */
export function Header({ overlay = false }: { overlay?: boolean }) {
  const { t } = useI18n();
  const { hotel } = useHotel();
  const { path } = useRouter();
  const items = useNavItems();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelRef = useFocusTrap<HTMLDivElement>(open, () => setOpen(false));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [path]);

  const transparent = overlay && !scrolled && !open;
  return (
    <>
      <header className={`site-header ${transparent ? "site-header--overlay" : "site-header--solid"}`}>
        <div className="site-header__inner">
          <Link to="/" className="site-header__brand" aria-label={`${hotel.name}, ${t.nav.home}`}>
            <img src={transparent ? "/brand/logo-light.png" : "/brand/logo-dark.png"} alt="" width="92" height="58" />
          </Link>

          <nav className="site-nav" aria-label={t.nav.mainNav}>
            <ul>
              {items.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="site-nav__link" aria-current={isActivePath(path, item.to) ? "page" : undefined}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="site-header__actions">
            <LanguageSwitch className="site-header__lang" />
            <Link to="/booking" className="button button--header">
              {t.nav.book}
            </Link>
            <button
              type="button"
              className="menu-toggle"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="menu-toggle__bar" aria-hidden="true" />
              <span className="menu-toggle__bar" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Outside <header>: the header's backdrop-filter would otherwise confine this fixed panel to its own box. */}
      <div id="mobile-menu" ref={panelRef} className={`mobile-menu ${open ? "is-open" : ""}`} role="dialog" aria-modal="true" aria-label={t.nav.mainNav}>
        <div className="mobile-menu__top">
          <img src="/brand/logo-light.png" alt="" width="84" height="53" />
          <button type="button" className="mobile-menu__close" onClick={() => setOpen(false)} aria-label={t.nav.closeMenu} data-autofocus>
            {t.common.close}
          </button>
        </div>
        <nav aria-label={t.nav.mainNav}>
          <ul className="mobile-menu__list">
            <li>
              <Link to="/" aria-current={path === "/" ? "page" : undefined}>
                {t.nav.home}
              </Link>
            </li>
            {items.map((item) => (
              <li key={item.to}>
                <Link to={item.to} aria-current={isActivePath(path, item.to) ? "page" : undefined}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mobile-menu__foot">
          <Link to="/booking" className="button button--light">
            {t.nav.book}
          </Link>
          <Link to="/booking/manage" className="mobile-menu__small">
            {t.nav.manage}
          </Link>
          <a href={telHref(hotel.phone)} className="mobile-menu__small">
            {hotel.phone}
          </a>
          <LanguageSwitch className="mobile-menu__lang" />
        </div>
      </div>
    </>
  );
}
