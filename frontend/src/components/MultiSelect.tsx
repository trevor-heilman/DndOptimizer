/**
 * MultiSelect — a styled dropdown with checkboxes for multi-value filter selection.
 */
import { useState, useRef, useEffect } from 'react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  id?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  /** Text shown when nothing is selected, e.g. "All Schools" */
  placeholder: string;
  className?: string;
}

export function MultiSelect({ id, options, value, onChange, placeholder, className = '' }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  const toggle = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      onChange([...value, v]);
    }
  };

  const displayLabel =
    value.length === 0
      ? placeholder
      : value.length === 1
      ? (options.find((o) => o.value === value[0])?.label ?? value[0])
      : `${value.length} selected`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="dnd-input font-body text-sm py-1.5 w-full text-left flex items-center justify-between gap-1"
      >
        <span className={value.length === 0 ? 'text-smoke-500' : 'text-parchment-200 truncate'}>
          {displayLabel}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-smoke-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-stone-900 border border-smoke-700 rounded-md shadow-xl max-h-52 overflow-y-auto">
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-xs text-smoke-400 hover:text-parchment-200 border-b border-smoke-800 font-body"
            >
              Clear all
            </button>
          )}
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-smoke-800/60 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="w-3.5 h-3.5 rounded border-smoke-600 bg-stone-950 accent-gold-500 cursor-pointer shrink-0"
              />
              <span className="font-body text-sm text-parchment-300">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
