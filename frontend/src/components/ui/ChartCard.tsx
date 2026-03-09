/**
 * ChartCard — consistent dnd-card wrapper for all Recharts charts.
 */
import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, children, footer, className = '' }: ChartCardProps) {
  return (
    <div className={`dnd-card border-t-2 border-gold-800/60 p-6 ${className}`}>
      <h3 className="font-display text-lg font-semibold text-gold-300 mb-1">{title}</h3>
      {subtitle && (
        <p className="font-body text-sm text-parchment-500 mb-4">{subtitle}</p>
      )}
      {children}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}

export default ChartCard;
