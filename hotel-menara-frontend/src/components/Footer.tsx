import { useI18n } from "../i18n/LanguageContext";
import { useHotel } from "../context/HotelContext";
import { telHref } from "../lib/hotel";
import { Link } from "../router/Router";
import { LanguageSwitch, useNavItems } from "./Header";

export function Footer() {
  const { t } = useI18n();
  const { hotel } = useHotel();
  const items = useNavItems();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <img src="/brand/logo-light.png" alt={hotel.name} width="120" height="76" />
          <p>{t.footer.tagline}</p>
        </div>

        <nav className="site-footer__col" aria-label={t.footer.explore}>
          <h2 className="site-footer__title">{t.footer.explore}</h2>
          <ul>
            {items.map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
            <li>
              <Link to="/booking">{t.nav.book}</Link>
            </li>
            <li>
              <Link to="/booking/manage">{t.nav.manage}</Link>
            </li>
          </ul>
        </nav>

        <div className="site-footer__col">
          <h2 className="site-footer__title">{t.footer.contact}</h2>
          <address>
            {hotel.street}
            <br />
            {hotel.postalCode} {hotel.city}, {hotel.country}
          </address>
          <ul>
            <li>
              <a href={telHref(hotel.phone)}>{hotel.phone}</a>
            </li>
            <li>
              <a href={`mailto:${hotel.email}`}>{hotel.email}</a>
            </li>
          </ul>
        </div>

        <div className="site-footer__col">
          <h2 className="site-footer__title">{t.footer.follow}</h2>
          <ul>
            <li>
              <a href={hotel.instagram} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            </li>
            <li>
              <a href={hotel.facebook} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="site-footer__bottom">
        <p>{t.footer.rights(new Date().getFullYear())}</p>
        <div className="site-footer__bottom-links">
          <LanguageSwitch />
          <Link to="/admin">{t.footer.admin}</Link>
        </div>
      </div>
    </footer>
  );
}
