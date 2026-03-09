/**
 * FormField — shared label + input/select/textarea with optional error message.
 */
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface BaseProps {
  label: string;
  id: string;
  error?: string;
  hint?: string;
}

type InputFieldProps = BaseProps & { as?: 'input' } & InputHTMLAttributes<HTMLInputElement>;
type SelectFieldProps = BaseProps & { as: 'select'; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>;
type TextareaFieldProps = BaseProps & { as: 'textarea' } & TextareaHTMLAttributes<HTMLTextAreaElement>;

type FormFieldProps = InputFieldProps | SelectFieldProps | TextareaFieldProps;

export function FormField(props: FormFieldProps) {
  const { label, id, error, hint, as: Tag = 'input', ...rest } = props;

  const inputClass = `dnd-input font-body${error ? ' border-crimson-600' : ''}`;

  return (
    <div>
      <label htmlFor={id} className="block font-display text-sm font-medium text-parchment-300 mb-1">
        {label}
      </label>

      {Tag === 'select' ? (
        <select id={id} className={inputClass} {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}>
          {(props as SelectFieldProps).children}
        </select>
      ) : Tag === 'textarea' ? (
        <textarea id={id} className={`${inputClass} resize-none`} {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input id={id} className={inputClass} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
      )}

      {hint && !error && (
        <p className="mt-1 font-body text-xs text-parchment-500">{hint}</p>
      )}
      {error && (
        <p className="mt-1 font-body text-xs text-crimson-400">{error}</p>
      )}
    </div>
  );
}

export default FormField;
