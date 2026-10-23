import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useI18n } from "../i18n/LanguageContext";

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

function FieldShell({ id, label, hint, error, optional, children, className = "" }: FieldShellProps) {
  const { t } = useI18n();
  return (
    <div className={`field ${error ? "field--error" : ""} ${className}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {optional && <span className="field__optional"> ({t.common.optional})</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, hint?: string, error?: string) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

type Common = { label: string; hint?: string; error?: string; optional?: boolean; className?: string };

export function TextField({ label, hint, error, optional, className, id: givenId, ...input }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const id = givenId ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <input id={id} className="field__control" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} {...input} />
    </FieldShell>
  );
}

export function TextArea({ label, hint, error, optional, className, id: givenId, ...input }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId();
  const id = givenId ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <textarea id={id} className="field__control field__control--area" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} {...input} />
    </FieldShell>
  );
}

export function SelectField({ label, hint, error, optional, className, id: givenId, children, ...input }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const autoId = useId();
  const id = givenId ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      <select id={id} className="field__control field__control--select" aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} {...input}>
        {children}
      </select>
    </FieldShell>
  );
}

export function Checkbox({ label, checked, onChange, id: givenId }: { label: string; checked: boolean; onChange: (checked: boolean) => void; id?: string }) {
  const autoId = useId();
  const id = givenId ?? autoId;
  return (
    <div className="checkbox">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}
