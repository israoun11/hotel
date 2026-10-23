import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { useHotel } from "../context/HotelContext";
import { LoadError, Loading, Notice } from "../components/Feedback";
import { Checkbox, TextArea, TextField } from "../components/Fields";
import { clearApiCache, useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useSubmit } from "../hooks/useSubmit";
import { useI18n } from "../i18n/LanguageContext";
import { errorMessage, fieldErrorsFrom } from "../lib/errors";
import { settingsDiff, toSettingsForm, type SettingsForm } from "../lib/settings";
import { validateSettings, type Errors, type SettingsFormInput } from "../lib/validation";
import { AdminHeader, useFlash } from "./ui";

const ALIASES = {
  "address.street": "street",
  "address.city": "city",
  "address.country": "country",
  "contact.phone": "phone",
  "contact.email": "email",
  "socialLinks.facebook": "facebook",
  "socialLinks.instagram": "instagram",
};

export function SettingsPage() {
  const { t } = useI18n();
  const { reloadSettings } = useHotel();
  const loaded = useApi("admin:settings", api.settings, { cacheable: false });
  const [base, setBase] = useState<SettingsForm | null>(null);
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { pending, run } = useSubmit();
  const { flash, node: flashNode } = useFlash();
  useDocumentTitle(t.admin.nav.settings);

  useEffect(() => {
    if (loaded.data) {
      setBase(toSettingsForm(loaded.data));
      setForm(toSettingsForm(loaded.data));
    }
  }, [loaded.data]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form || !base) return;
    const found = validateSettings(form, t);
    setErrors(found);
    setFailure(null);
    setInfo(null);
    if (Object.keys(found).length > 0) {
      setFailure(t.validation.fixErrors);
      return;
    }
    const body = settingsDiff(base, form);
    if (Object.keys(body).length === 0) {
      setInfo(t.admin.settings.nothingChanged);
      return;
    }
    await run(async () => {
      try {
        const saved = await api.admin.updateSettings(body);
        setBase(toSettingsForm(saved));
        setForm(toSettingsForm(saved));
        clearApiCache();
        reloadSettings();
        flash(t.admin.settings.saved);
      } catch (error) {
        setErrors(fieldErrorsFrom(error, ALIASES));
        setFailure(errorMessage(error, t));
      }
    });
  };

  const field = (key: keyof SettingsFormInput) => ({
    value: form?.[key] ?? "",
    error: errors[key],
    onChange: (e: { target: { value: string } }) => setForm((f) => (f ? { ...f, [key]: e.target.value } : f)),
  });

  return (
    <>
      <AdminHeader title={t.admin.nav.settings} />
      {flashNode}
      {loaded.loading && <Loading />}
      {loaded.error !== undefined && <LoadError error={loaded.error} onRetry={loaded.reload} />}
      {form && (
        <form className="form settings-form" onSubmit={submit} noValidate>
          {failure && <Notice tone="error">{failure}</Notice>}
          {info && <Notice>{info}</Notice>}
          <fieldset className="admin-card">
            <legend>{t.admin.settings.general}</legend>
            <TextField label={t.admin.settings.hotelName} {...field("hotelName")} required maxLength={120} />
            <TextField label={t.admin.settings.tagline} {...field("tagline")} optional maxLength={200} />
            <TextArea label={t.admin.settings.description} rows={5} {...field("description")} optional maxLength={3000} />
          </fieldset>
          <fieldset className="admin-card">
            <legend>{t.admin.settings.address}</legend>
            <TextField label={t.admin.settings.street} {...field("street")} optional maxLength={200} />
            <div className="form__row">
              <TextField label={t.admin.settings.city} {...field("city")} optional maxLength={100} />
              <TextField label={t.admin.settings.country} {...field("country")} optional maxLength={100} />
            </div>
          </fieldset>
          <fieldset className="admin-card">
            <legend>{t.admin.settings.contact}</legend>
            <div className="form__row">
              <TextField label={t.admin.settings.phone} type="tel" {...field("phone")} optional maxLength={30} />
              <TextField label={t.admin.settings.email} type="email" {...field("email")} required />
            </div>
          </fieldset>
          <fieldset className="admin-card">
            <legend>{t.admin.settings.social}</legend>
            <p className="field__hint">{t.admin.settings.socialHint}</p>
            <div className="form__row">
              <TextField label="Facebook" type="url" {...field("facebook")} optional />
              <TextField label="Instagram" type="url" {...field("instagram")} optional />
            </div>
          </fieldset>
          <fieldset className="admin-card">
            <legend>{t.admin.settings.stay}</legend>
            <div className="form__row form__row--3">
              <TextField label={t.admin.settings.checkInTime} type="time" {...field("checkInTime")} required />
              <TextField label={t.admin.settings.checkOutTime} type="time" {...field("checkOutTime")} required />
              <TextField label={t.admin.settings.maxStay} type="number" min={1} max={90} {...field("maxStayNights")} required />
            </div>
            <div className="form__row form__row--3">
              <TextField label={t.admin.settings.currency} {...field("currency")} required maxLength={3} />
              <TextField label={t.admin.settings.taxRate} inputMode="decimal" {...field("taxRatePercent")} required />
              <TextField label={t.admin.settings.touristTax} inputMode="decimal" {...field("touristTaxPerAdultPerNight")} required />
            </div>
            <TextArea label={t.admin.settings.cancellation} rows={4} {...field("cancellationPolicy")} optional maxLength={3000} />
            <Checkbox label={t.admin.settings.bookingEnabled} checked={form.isBookingEnabled} onChange={(isBookingEnabled) => setForm((f) => (f ? { ...f, isBookingEnabled } : f))} />
          </fieldset>
          <div className="form__actions form__actions--sticky">
            <button type="submit" className="admin-button admin-button--primary" disabled={pending} aria-busy={pending}>
              {pending ? t.admin.form.saving : t.common.save}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
