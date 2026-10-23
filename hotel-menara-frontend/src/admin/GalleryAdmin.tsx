import { useState, type FormEvent } from "react";
import { api } from "../api";
import { GALLERY_CATEGORIES, type GalleryCategory, type GalleryInput, type GalleryItem } from "../api/types";
import { LoadError, Loading, Notice } from "../components/Feedback";
import { Checkbox, SelectField, TextField } from "../components/Fields";
import { clearApiCache, useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useSubmit } from "../hooks/useSubmit";
import { useI18n } from "../i18n/LanguageContext";
import { errorMessage, fieldErrorsFrom } from "../lib/errors";
import { isUsableImageUrl } from "../lib/hotel";
import { isHttpUrl, validateGalleryItem, type Errors } from "../lib/validation";
import { AdminHeader, ConfirmDialog, DemoBadge, Modal, useFlash } from "./ui";

interface GalleryForm {
  title: string;
  caption: string;
  imageUrl: string;
  category: GalleryCategory;
  order: string;
  isActive: boolean;
}

const EMPTY: GalleryForm = { title: "", caption: "", imageUrl: "", category: "exterior", order: "0", isActive: true };

const toForm = (g: GalleryItem): GalleryForm => ({
  title: g.title,
  caption: g.caption ?? "",
  imageUrl: g.imageUrl,
  category: g.category,
  order: String(g.order),
  isActive: g.isActive,
});

const toInput = (f: GalleryForm): GalleryInput => ({
  title: f.title.trim(),
  caption: f.caption.trim(),
  imageUrl: f.imageUrl.trim(),
  category: f.category,
  order: Number(f.order),
  isActive: f.isActive,
});

/** Small preview that reports when the URL does not serve an image. */
function Preview({ url }: { url: string }) {
  const { t } = useI18n();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!isHttpUrl(url)) return null;
  if (failedUrl === url) return <p className="field__error">{t.admin.gallery.previewError}</p>;
  return (
    <figure className="admin-preview">
      <img src={url} alt="" onError={() => setFailedUrl(url)} />
      <figcaption>{t.admin.gallery.preview}</figcaption>
    </figure>
  );
}

function Thumb({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  // Demo URLs (example.com) never serve images: do not even request them.
  return failed || !isUsableImageUrl(url) ? <span className="admin-thumb admin-thumb--broken" aria-hidden="true" /> : <img className="admin-thumb" src={url} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

export function GalleryAdminPage() {
  const { t } = useI18n();
  const gallery = useApi("admin:gallery", api.admin.gallery, { cacheable: false });
  const [editing, setEditing] = useState<GalleryItem | "new" | null>(null);
  const [form, setForm] = useState<GalleryForm>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<GalleryItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const saving = useSubmit();
  const removing = useSubmit();
  const { flash, node: flashNode } = useFlash();
  useDocumentTitle(t.admin.nav.gallery);

  const open = (g: GalleryItem | "new") => {
    setEditing(g);
    setForm(g === "new" ? EMPTY : toForm(g));
    setErrors({});
    setFailure(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateGalleryItem(form, t);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0 || editing === null) return;
    await saving.run(async () => {
      try {
        if (editing === "new") await api.admin.createGalleryItem(toInput(form));
        else await api.admin.updateGalleryItem(editing.id, toInput(form));
        clearApiCache();
        setEditing(null);
        flash(t.admin.gallery.saved);
        gallery.reload();
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
        await api.admin.deleteGalleryItem(deleting.id);
        clearApiCache();
        setDeleting(null);
        flash(t.admin.gallery.deleted);
        gallery.reload();
      } catch (error) {
        setDeleting(null);
        setDeleteError(errorMessage(error, t));
      }
    });
  };

  return (
    <>
      <AdminHeader
        title={t.admin.nav.gallery}
        actions={
          <button type="button" className="admin-button admin-button--primary" onClick={() => open("new")}>
            {t.admin.gallery.add}
          </button>
        }
      />
      {flashNode}
      {deleteError && <Notice tone="error">{deleteError}</Notice>}
      {gallery.loading && <Loading />}
      {gallery.error !== undefined && <LoadError error={gallery.error} onRetry={gallery.reload} />}
      {gallery.data && gallery.data.length === 0 && <p className="admin-empty">{t.admin.gallery.empty}</p>}
      {gallery.data && gallery.data.length > 0 && (
        <section className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t.admin.gallery.preview}</th>
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
              {gallery.data.map((g) => (
                <tr key={g.id}>
                  <td data-label={t.admin.gallery.preview}>
                    <Thumb url={g.imageUrl} />
                  </td>
                  <td data-label={t.admin.table.name}>
                    {g.title} {g.isDemo && <DemoBadge />}
                    {g.caption && <span className="admin-table__sub">{g.caption}</span>}
                  </td>
                  <td data-label={t.admin.table.category}>{t.gallery.categories[g.category]}</td>
                  <td data-label={t.admin.table.order}>{g.order}</td>
                  <td data-label={t.admin.table.active}>{g.isActive ? t.admin.form.yes : t.admin.rooms.inactive}</td>
                  <td className="admin-table__actions">
                    <button type="button" className="admin-button admin-button--small" onClick={() => open(g)}>
                      {t.admin.form.edit}
                      <span className="visually-hidden"> {g.title}</span>
                    </button>
                    <button
                      type="button"
                      className="admin-button admin-button--small admin-button--danger-quiet"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleting(g);
                      }}
                    >
                      {t.admin.form.delete}
                      <span className="visually-hidden"> {g.title}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Modal title={editing === "new" ? t.admin.gallery.create : t.admin.gallery.edit} open={editing !== null} onClose={() => setEditing(null)}>
        <form className="form" onSubmit={save} noValidate>
          {failure && <Notice tone="error">{failure}</Notice>}
          <TextField label={t.admin.gallery.title} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} error={errors.title} required maxLength={120} />
          <TextField label={t.admin.gallery.caption} value={form.caption} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))} error={errors.caption} optional maxLength={300} />
          <TextField label={t.admin.gallery.imageUrl} hint={t.admin.gallery.imageHint} type="url" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} error={errors.imageUrl} required />
          <Preview url={form.imageUrl.trim()} />
          <div className="form__row">
            <SelectField label={t.admin.gallery.category} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as GalleryCategory }))}>
              {GALLERY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t.gallery.categories[c]}
                </option>
              ))}
            </SelectField>
            <TextField label={t.admin.gallery.order} type="number" min={0} max={10000} value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))} error={errors.order} required />
          </div>
          <Checkbox label={t.admin.gallery.active} checked={form.isActive} onChange={(isActive) => setForm((f) => ({ ...f, isActive }))} />
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
        message={deleting ? t.admin.gallery.confirmDelete(deleting.title) : ""}
        confirmLabel={removing.pending ? t.admin.form.deleting : t.admin.form.delete}
        pending={removing.pending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
      />
    </>
  );
}
