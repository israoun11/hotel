import { useState, type FormEvent } from "react";
import { api } from "../api";
import { Notice } from "../components/Feedback";
import { TextArea, TextField } from "../components/Fields";
import { PageIntro } from "../components/PageIntro";
import { useHotel } from "../context/HotelContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useSubmit } from "../hooks/useSubmit";
import { useI18n } from "../i18n/LanguageContext";
import { errorMessage, fieldErrorsFrom } from "../lib/errors";
import { telHref } from "../lib/hotel";
import { validateContact, type ContactInput, type Errors } from "../lib/validation";
import { useRouter } from "../router/Router";

const EMPTY: ContactInput = { name: "", email: "", phone: "", subject: "", message: "" };

/** The booking page can open this form prefilled (?subject=…&message=…) for a stay request. */
function initialForm(params: URLSearchParams): ContactInput {
  return { ...EMPTY, subject: (params.get("subject") ?? "").slice(0, 150), message: (params.get("message") ?? "").slice(0, 2000) };
}

export function ContactPage() {
  const { t } = useI18n();
  const { hotel } = useHotel();
  const { search } = useRouter();
  const [form, setForm] = useState<ContactInput>(() => initialForm(search));
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { pending, run } = useSubmit();
  useDocumentTitle(t.contact.title);

  const set = (key: keyof ContactInput) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateContact(form, t);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0) return;
    await run(async () => {
      try {
        await api.sendContactMessage({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          subject: form.subject.trim(),
          message: form.message.trim(),
        });
        setSent(true);
        setForm(EMPTY);
      } catch (error) {
        setErrors(fieldErrorsFrom(error));
        setFailure(errorMessage(error, t));
      }
    });
  };

  return (
    <>
      <PageIntro title={t.contact.title} lead={t.contact.lead} />
      <section className="contact">
        <div className="contact__info">
          <div>
            <h2 className="contact__label">{t.contact.addressTitle}</h2>
            <address>
              {hotel.name}
              <br />
              {hotel.street}
              <br />
              {hotel.postalCode} {hotel.city}, {hotel.country}
            </address>
            <a className="text-link" href={hotel.mapUrl} target="_blank" rel="noopener noreferrer">
              {t.contact.map}
            </a>
          </div>
          <div>
            <h2 className="contact__label">{t.contact.phoneTitle}</h2>
            <a href={telHref(hotel.phone)} className="contact__big">
              {hotel.phone}
            </a>
          </div>
          <div>
            <h2 className="contact__label">{t.contact.emailTitle}</h2>
            <a href={`mailto:${hotel.email}`} className="contact__big">
              {hotel.email}
            </a>
          </div>
          <div>
            <h2 className="contact__label">{t.contact.followTitle}</h2>
            <p className="contact__social">
              <a href={hotel.instagram} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
              <a href={hotel.facebook} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
            </p>
          </div>
        </div>

        <div className="contact__form-wrap" id="contact-form">
          <h2 className="display-3">{t.contact.formTitle}</h2>
          {sent ? (
            <div className="contact__sent">
              <Notice tone="success">{t.contact.success}</Notice>
              <button type="button" className="button button--ghost" onClick={() => setSent(false)}>
                {t.contact.another}
              </button>
            </div>
          ) : (
            <form className="form" onSubmit={submit} noValidate>
              {failure && <Notice tone="error">{failure}</Notice>}
              <div className="form__row">
                <TextField label={t.contact.name} name="name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} required maxLength={100} />
                <TextField label={t.contact.email} name="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} required />
              </div>
              <div className="form__row">
                <TextField label={t.contact.phone} name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} error={errors.phone} optional />
                <TextField label={t.contact.subject} name="subject" value={form.subject} onChange={set("subject")} error={errors.subject} required maxLength={150} />
              </div>
              <TextArea label={t.contact.message} name="message" rows={9} value={form.message} onChange={set("message")} error={errors.message} required maxLength={2000} />
              <button type="submit" className="button button--primary" disabled={pending} aria-busy={pending}>
                {pending ? t.contact.sending : t.contact.submit}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
