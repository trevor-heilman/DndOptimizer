/**
 * AlertMessage — shared error / success / warning alert card.
 */
interface AlertMessageProps {
  variant: 'error' | 'success' | 'warning';
  title?: string;
  message: string;
}

const VARIANT_STYLES = {
  error: {
    wrapper: 'dnd-card border-l-4 border-crimson-700',
    title: 'font-display text-xl font-semibold text-crimson-400 mb-1',
    body: 'font-body text-parchment-400',
  },
  success: {
    wrapper: 'dnd-card border-l-4 border-gold-700',
    title: 'font-display text-base font-semibold text-gold-300 mb-1',
    body: 'font-body text-parchment-300',
  },
  warning: {
    wrapper: 'dnd-card border-l-4 border-arcane-600',
    title: 'font-display text-base font-semibold text-arcane-300 mb-1',
    body: 'font-body text-parchment-400',
  },
};

export function AlertMessage({ variant, title, message }: AlertMessageProps) {
  const styles = VARIANT_STYLES[variant];
  return (
    <div className={`${styles.wrapper} p-4`}>
      {title && <p className={styles.title}>{title}</p>}
      <p className={styles.body}>{message}</p>
    </div>
  );
}

export default AlertMessage;
