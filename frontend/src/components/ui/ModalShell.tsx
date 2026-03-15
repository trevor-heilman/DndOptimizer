/**
 * ModalShell — shared modal overlay + dnd-card container with header, body and footer slots.
 */
import type { ReactNode } from 'react';

interface ModalShellProps {
  /** Top border accent: "gold" (default), "arcane", or "crimson" */
  accent?: 'gold' | 'arcane' | 'crimson';
  /** Max width Tailwind class, e.g. "max-w-md" (default) */
  maxWidth?: string;
  /** Header slot: title text or any node */
  title: ReactNode;
  /** Body content */
  children: ReactNode;
  /** Footer slot (action buttons) */
  footer?: ReactNode;
  /** Called when the × button or overlay is not clicked (caller controls) */
  onClose: () => void;
  disabled?: boolean;
}

const ACCENT_BORDER: Record<string, string> = {
  gold:   'border-gold-800',
  arcane: 'border-arcane-700',
  crimson: 'border-crimson-800',
};

const ACCENT_TITLE: Record<string, string> = {
  gold:   'text-gold-300',
  arcane: 'text-arcane-300',
  crimson: 'text-crimson-300',
};

export function ModalShell({
  accent = 'gold',
  maxWidth = 'max-w-md',
  title,
  children,
  footer,
  onClose,
  disabled = false,
}: ModalShellProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className={`dnd-card border-t-2 ${ACCENT_BORDER[accent]} ${maxWidth} w-full shadow-2xl flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-smoke-700">
          <h2 className={`font-display text-xl font-bold ${ACCENT_TITLE[accent]}`}>
            {title}
          </h2>
          <button
            onClick={onClose}
            disabled={disabled}
            className="text-parchment-500 hover:text-parchment-200 disabled:opacity-50 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-3 p-6 border-t border-smoke-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default ModalShell;
