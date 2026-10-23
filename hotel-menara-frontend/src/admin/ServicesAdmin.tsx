import { useState, type FormEvent } from "react";
import { api } from "../api";
import { SERVICE_CATEGORIES, type HotelService, type ServiceCategory, type ServiceInput } from "../api/types";
import { LoadError, Loading, Notice } from "../components/Feedback";
import { Checkbox, SelectField, TextArea, TextField } from "../components/Fields";
import { clearApiCache, useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useSubmit } from "../hooks/useSubmit";
import { useI18n } from "../i18n/LanguageContext";
import { errorMessage, fieldErrorsFrom } from "../lib/errors";
import { validateService, type Errors } from "../lib/validation";
import { AdminHeader, ConfirmDialog, DemoBadge, Modal, useFlash } from "./ui";

interface ServiceForm {
  name: string;
  description: string;
  category: ServiceCategory;
  icon: string;
  order: string;
  isActive: boolean;
}

const EMPTY: ServiceForm = { name: "", description: "", category: "leisure", icon: "", order: "0", isActive: true };

const toForm = (s: HotelService): ServiceForm => ({
  name: s.name,
  description: s.description,
  category: s.category,
  icon: s.icon ?? "",
  order: String(s.order),
  isActive: s.isActive,
});

const toInput = (f: ServiceForm): ServiceInput => ({
  name: f.name.trim(),
  description: f.description.trim(),
  category: f.category,
  ...(f.icon.trim() ? { icon: f.icon.trim() } : {}),
  order: Number(f.order),
  isActive: f.isActive,
});

export function ServicesAdminPage() {
  const { t } = useI18n();
  const services = useApi("admin:services", api.admin.services, { cacheable: false });
  const [editing, setEditing] = useState<HotelService | "new" | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<HotelService | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const saving = useSubmit();
  const removing = useSubmit();
  const { flash, node: flashNode } = useFlash();
  useDocumentTitle(t.admin.nav.services);

  const open = (s: HotelService | "new") => {
    setEditing(s);
    setForm(s === "new" ? EMPTY : toForm(s));
    setErrors({});
    setFailure(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateService(form, t);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0 || editing === null) return;
    await saving.run(async () => {
      try {
        if (editing === "new") await api.admin.createService(toInput(form));
        else await api.admin.updateService(editing.id, toInput(form));
        clearApiCache();
        setEditing(null);
        flash(t.admin.services.saved);
        services.reload();
      } catch (error) {
        setErrors(fieldErrorsFrom(error));
        setFailure(errorMessage(error, t));
      }
    });
  };

  const remove = async () => {
    if (!deleting) return;
    await removing.run(async () => {
      try {
        await api.admin.deleteService(deleting.id);
        clearApiCache();
        setDeleting(null);
        flash(t.admin.services.deleted);
        services.reload();
      } catch (error) {
        setDeleting(null);
        setDeleteError(errorMessage(error, t));
      }
    });
  };

  return (
    <>
      <AdminHeader
        title={t.admin.nav.services}
        actions={
          <button type="button" className="admin-button admin-button--primary" onClick={() => open("new")}>
            {t.admin.services.add}
          </button>
        }
      />
      {flashNode}
      {deleteError && <Notice tone="error">{deleteError}</Notice>}
      {services.loading && <Loading />}
      {services.error !== undefined && <LoadError error={services.error} onRetry={services.reload} />}
      {services.data && services.data.length === 0 && <p className="admin-empty">{t.admin.services.empty}</p>}
      {services.data && services.data.length > 0 && (
        <section className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t.admin.table.name}</th>
                <th scope="col">{t.admin.table.category}</th>
                <th scope="col">{t.admin.table.order}</th>
                <th scope="col">{t.admin.table.active}</th>
                <th scope="col">
                  <span className="visually-hidden">{t.admin.table.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {services.data.map((s) => (
                <tr key={s.id}>
                  <td data-label={t.admin.table.name}>
                    {s.name} {s.isDemo && <DemoBadge />}
                    <span className="admin-table__sub">{s.description}</span>
                  </td>
                  <td data-label={t.admin.table.category}>{t.services.categories[s.category]}</td>
                  <td data-label={t.admin.table.order}>{s.order}</td>
                  <td data-label={t.admin.table.active}>{s.isActive ? t.admin.form.yes : t.admin.rooms.inactive}</td>
                  <td className="admin-table__actions">
                    <button type="button" className="admin-button admin-button--small" onClick={() => open(s)}>
                      {t.admin.form.edit}
                      <span className="visually-hidden"> {s.name}</span>
                    </button>
                    <button
                      type="button"
                      className="admin-button admin-button--small admin-button--danger-quiet"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleting(s);
                      }}
                    >
                      {t.admin.form.delete}
                      <span className="visually-hidden"> {s.name}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Modal title={editing === "new" ? t.admin.services.create : t.admin.services.edit} open={editing !== null} onClose={() => setEditing(null)}>
        <form className="form" onSubmit={save} noValidate>
          {failure && <Notice tone="error">{failure}</Notice>}
          <TextField label={t.admin.services.name} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} error={errors.name} required maxLength={100} />
          <TextArea label={t.admin.services.description} rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} error={errors.description} required maxLength={1000} />
          <div className="form__row">
            <SelectField label={t.admin.services.category} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ServiceCategory }))}>
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t.services.categories[c]}
                </option>
              ))}
            </SelectField>
            <TextField label={t.admin.services.order} type="number" min={0} max={10000} value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))} error={errors.order} required />
          </div>
          <TextField label={t.admin.services.icon} hint={t.admin.services.iconHint} value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} error={errors.icon} optional maxLength={40} />
          <Checkbox label={t.admin.services.active} checked={form.isActive} onChange={(isActive) => setForm((f) => ({ ...f, isActive }))} />
          <div className="form__actions">
            <button type="button" className="admin-button admin-button--quiet" onClick={() => setEditing(null)}>
              {t.common.cancel}
            </button>
            <button type="submit" className="admin-button admin-button--primary" disabled={saving.pending} aria-busy={saving.pending}>
              {saving.pending ? t.admin.form.saving : t.common.save}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        message={deleting ? t.admin.services.confirmDelete(deleting.name) : ""}
        confirmLabel={removing.pending ? t.admin.form.deleting : t.admin.form.delete}
        pending={removing.pending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
      />
    </>
  );
}
