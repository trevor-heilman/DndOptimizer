/**
 * BookColorPicker — 16-color inline swatch picker.
 * No color wheel; just 16 curated arcane theme colors in a 4×4 grid.
 */
import type { BookColor } from '../types/api';
import { BOOK_COLOR_LIST, BOOK_PALETTES } from '../constants/bookColors';

interface BookColorPickerProps {
  value: BookColor;
  onChange: (color: BookColor) => void;
  disabled?: boolean;
}

export function BookColorPicker({ value, onChange, disabled = false }: BookColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Book color">
      {BOOK_COLOR_LIST.map((color) => {
        const p = BOOK_PALETTES[color];
        const selected = color === value;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={p.name}
            title={p.name}
            disabled={disabled}
            onClick={() => onChange(color)}
            className="relative rounded-md transition-all duration-150 focus:outline-none"
            style={{
              width: '28px',
              height: '36px',
              background: p.grad,
              border: selected
                ? `2px solid ${p.accent}`
                : `1px solid ${p.border}`,
              boxShadow: selected
                ? `0 0 8px ${p.accent}88, 0 2px 6px rgba(0,0,0,0.5)`
                : '0 1px 4px rgba(0,0,0,0.4)',
              transform: selected ? 'translateY(-3px) scale(1.08)' : 'none',
              opacity: disabled ? 0.5 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {selected && (
              <span
                className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
                style={{ color: p.accent, textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                aria-hidden="true"
              >
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
