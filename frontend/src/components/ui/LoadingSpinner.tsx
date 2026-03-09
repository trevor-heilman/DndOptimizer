/**
 * Loading Spinner — shared full-section loading indicator.
 */
interface LoadingSpinnerProps {
  /** Tailwind height class for the containing div, e.g. "h-64" (default) or "min-h-screen" */
  height?: string;
  label?: string;
}

export function LoadingSpinner({ height = 'h-64', label }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${height}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto"></div>
        {label && <p className="mt-4 font-body text-parchment-400">{label}</p>}
      </div>
    </div>
  );
}

export default LoadingSpinner;
