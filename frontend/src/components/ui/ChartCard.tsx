/**
 * ChartCard — consistent dnd-card wrapper for all Recharts charts.
 */
import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Optional content rendered to the right of the title */
  headerExtra?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, headerExtra, children, footer, className = '' }: ChartCardProps) {
  return (
    <div className={`dnd-card border-t-2 border-gold-800/60 p-6 ${className}`}>
      <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
        <h3 className="font-display text-lg font-semibold text-gold-300">{title}</h3>
        {headerExtra && <div className="shrink-0">{headerExtra}</div>}
      </div>
      {subtitle && (
        <p className="font-body text-sm text-parchment-500 mb-4">{subtitle}</p>
      )}
      {children}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}

export default ChartCard;
