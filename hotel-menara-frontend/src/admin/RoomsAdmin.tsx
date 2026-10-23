import { useState, type FormEvent } from "react";
import { api } from "../api";
import { ROOM_TYPES, type Room, type RoomInput, type RoomType } from "../api/types";
import { LoadError, Loading, Notice } from "../components/Feedback";
import { useHotel } from "../context/HotelContext";
import { Checkbox, SelectField, TextArea, TextField } from "../components/Fields";
import { clearApiCache, useApi } from "../hooks/useApi";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useSubmit } from "../hooks/useSubmit";
import { useI18n } from "../i18n/LanguageContext";
import { errorMessage, fieldErrorsFrom } from "../lib/errors";
import { formatMoney } from "../lib/format";
import { splitLines, toNumber, validateRoom, type Errors, type RoomFormInput } from "../lib/validation";
import { AdminHeader, ConfirmDialog, DemoBadge, Modal, useFlash } from "./ui";

interface RoomForm extends RoomFormInput {
  type: RoomType;
  isActive: boolean;
}

const EMPTY: RoomForm = { name: "", slug: "", type: "double", description: "", capacity: "2", totalUnits: "1", pricePerNight: "", amenities: "", images: "", isActive: true };

const toForm = (room: Room): RoomForm => ({
  name: room.name,
  slug: room.slug,
  type: room.type,
  description: room.description,
  capacity: String(room.capacity),
  totalUnits: String(room.totalUnits),
  pricePerNight: String(room.pricePerNight),
  amenities: room.amenities.join("\n"),
  images: room.images.join("\n"),
  isActive: room.isActive,
});

/** Body accepted by POST /rooms and PATCH /rooms/:id (strict schema: only these fields). */
function toInput(form: RoomForm): RoomInput {
  const slug = form.slug.trim().toLowerCase();
  return {
    name: form.name.trim(),
    ...(slug ? { slug } : {}),
    type: form.type,
    description: form.description.trim(),
    capacity: Number(form.capacity),
    totalUnits: Number(form.totalUnits),
    pricePerNight: toNumber(form.pricePerNight),
    amenities: splitLines(form.amenities),
    images: splitLines(form.images),
    isActive: form.isActive,
  };
}

export function RoomsAdminPage() {
  const { t, lang } = useI18n();
  const { hotel } = useHotel();
  const rooms = useApi("admin:rooms", api.admin.rooms, { cacheable: false });
  const [editing, setEditing] = useState<Room | "new" | null>(null);
  const [form, setForm] = useState<RoomForm>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Room | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const saving = useSubmit();
  const removing = useSubmit();
  const { flash, node: flashNode } = useFlash();
  useDocumentTitle(t.admin.nav.rooms);

  const open = (room: Room | "new") => {
    setEditing(room);
    setForm(room === "new" ? EMPTY : toForm(room));
    setErrors({});
    setFailure(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateRoom(form, t);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length > 0 || editing === null) return;
    await saving.run(async () => {
      try {
        if (editing === "new") await api.admin.createRoom(toInput(form));
        else await api.admin.updateRoom(editing.id, toInput(form));
        clearApiCache();
        setEditing(null);
        flash(t.admin.rooms.saved);
        rooms.reload();
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
        await api.admin.deleteRoom(deleting.id);
        clearApiCache();
        setDeleting(null);
        flash(t.admin.rooms.deleted);
        rooms.reload();
      } catch (error) {
        setDeleting(null);
        setDeleteError(errorMessage(error, t));
      }
    });
  };

  const set = (key: keyof RoomFormInput) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <AdminHeader
        title={t.admin.nav.rooms}
        actions={
          <button type="button" className="admin-button admin-button--primary" onClick={() => open("new")}>
            {t.admin.rooms.add}
          </button>
        }
      />
      {flashNode}
      {deleteError && <Notice tone="error">{deleteError}</Notice>}
      {rooms.loading && <Loading />}
      {rooms.error !== undefined && <LoadError error={rooms.error} onRetry={rooms.reload} />}
      {rooms.data && rooms.data.length === 0 && <p className="admin-empty">{t.admin.rooms.empty}</p>}
      {rooms.data && rooms.data.length > 0 && (
        <section className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t.admin.table.name}</th>
                <th scope="col">{t.admin.table.type}</th>
                <th scope="col">{t.admin.table.capacity}</th>
                <th scope="col">{t.admin.table.units}</th>
                <th scope="col">{t.admin.table.price}</th>
                <th scope="col">{t.admin.table.active}</th>
                <th scope="col">
                  <span className="visually-hidden">{t.admin.table.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rooms.data.map((room) => (
                <tr key={room.id}>
                  <td data-label={t.admin.table.name}>
                    {room.name} {room.isDemo && <DemoBadge />}
                    <span className="admin-table__sub">/{room.slug}</span>
                  </td>
                  <td data-label={t.admin.table.type}>{t.rooms.types[room.type]}</td>
                  <td data-label={t.admin.table.capacity}>{room.capacity}</td>
                  <td data-label={t.admin.table.units}>{room.totalUnits}</td>
                  <td data-label={t.admin.table.price}>{formatMoney(room.pricePerNight, hotel.currency, lang)}</td>
                  <td data-label={t.admin.table.active}>{room.isActive ? t.admin.form.yes : t.admin.rooms.inactive}</td>
                  <td className="admin-table__actions">
                    <button type="button" className="admin-button admin-button--small" onClick={() => open(room)}>
                      {t.admin.form.edit}
                      <span className="visually-hidden"> {room.name}</span>
                    </button>
                    <button
                      type="button"
                      className="admin-button admin-button--small admin-button--danger-quiet"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleting(room);
                      }}
                    >
                      {t.admin.form.delete}
                      <span className="visually-hidden"> {room.name}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Modal title={editing === "new" ? t.admin.rooms.create : t.admin.rooms.edit} open={editing !== null} onClose={() => setEditing(null)} wide>
        <form className="form" onSubmit={save} noValidate>
          {failure && <Notice tone="error">{failure}</Notice>}
          <div className="form__row">
            <TextField label={t.admin.rooms.name} value={form.name} onChange={set("name")} error={errors.name} required maxLength={100} />
            <TextField label={t.admin.rooms.slug} hint={t.admin.rooms.slugHint} value={form.slug} onChange={set("slug")} error={errors.slug} optional />
          </div>
          <div className="form__row form__row--4">
            <SelectField label={t.admin.rooms.type} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as RoomType }))}>
              {ROOM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t.rooms.types[type]}
                </option>
              ))}
            </SelectField>
            <TextField label={t.admin.rooms.capacity} type="number" min={1} max={10} value={form.capacity} onChange={set("capacity")} error={errors.capacity} required />
            <TextField label={t.admin.rooms.units} type="number" min={1} max={500} value={form.totalUnits} onChange={set("totalUnits")} error={errors.totalUnits} required />
            <TextField label={t.admin.rooms.price} inputMode="decimal" value={form.pricePerNight} onChange={set("pricePerNight")} error={errors.pricePerNight} required />
          </div>
          <TextArea label={t.admin.rooms.description} rows={4} value={form.description} onChange={set("description")} error={errors.description} required maxLength={2000} />
          <div className="form__row">
            <TextArea label={t.admin.rooms.amenities} hint={t.admin.rooms.amenitiesHint} rows={5} value={form.amenities} onChange={set("amenities")} error={errors.amenities} optional />
            <TextArea label={t.admin.rooms.images} hint={t.admin.rooms.imagesHint} rows={5} value={form.images} onChange={set("images")} error={errors.images} optional />
          </div>
          <Checkbox label={t.admin.rooms.active} checked={form.isActive} onChange={(isActive) => setForm((f) => ({ ...f, isActive }))} />
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
        message={deleting ? t.admin.rooms.confirmDelete(deleting.name) : ""}
        confirmLabel={removing.pending ? t.admin.form.deleting : t.admin.form.delete}
        pending={removing.pending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
      />
    </>
  );
}
