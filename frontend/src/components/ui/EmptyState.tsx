/**
 * EmptyState — shared zero-results / no-content card.
 */
interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'gold' | 'primary';
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: EmptyStateAction;
}

export function EmptyState({ icon = '🔮', title, description, action }: EmptyStateProps) {
  return (
    <div className="dnd-card border-t-2 border-gold-800 p-10 text-center">
      <div className="text-4xl mb-3" aria-hidden="true">{icon}</div>
      <h2 className="font-display text-xl font-semibold text-gold-300 mb-2">{title}</h2>
      {description && (
        <p className="font-body text-parchment-400 mb-6">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className={action.variant === 'primary' ? 'btn-primary px-8 py-2.5' : 'btn-gold px-8 py-2.5'}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
