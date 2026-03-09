/**
 * Home/Dashboard Page
 */
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const features = [
  {
    to: '/spells',
    icon: '📖',
    title: 'Spell Library',
    description: 'Browse, search, and manage your entire spell collection with detailed statistics and damage breakdowns.',
    accentColor: 'border-arcane-700',
    hoverGlow: 'hover:shadow-arcane-900/40',
  },
  {
    to: '/spellbooks',
    icon: '📚',
    title: 'Spellbooks',
    description: "Create and organize prepared spell lists for your characters. Track what's prepared and ready for battle.",
    accentColor: 'border-gold-700',
    hoverGlow: 'hover:shadow-gold-900/40',
  },
  {
    to: '/compare',
    icon: '⚖️',
    title: 'Compare Spells',
    description: 'Pit spells against each other with mathematical precision. Discover the optimal choice for every encounter.',
    accentColor: 'border-crimson-700',
    hoverGlow: 'hover:shadow-crimson-900/40',
  },
];

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center py-10">
        <div className="inline-block mb-4 text-5xl" aria-hidden="true">🧙‍♂️</div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-gold-300 mb-4 tracking-wide">
          DndOptimizer
        </h1>
        <div className="arcane-divider max-w-xs mx-auto mb-4">
          <span>✦ ✦ ✦</span>
        </div>
        <p className="font-body text-xl text-parchment-200 max-w-2xl mx-auto leading-relaxed">
          Wield the power of mathematics to master the arcane arts. Optimize your{' '}
          <em>D&amp;D 5e</em> spell selections and dominate every encounter.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map(({ to, icon, title, description, accentColor, hoverGlow }) => (
          <Link
            key={to}
            to={to}
            className={`block dnd-card p-6 border-t-2 ${accentColor}
                        hover:shadow-xl ${hoverGlow} hover:-translate-y-0.5
                        transition-all duration-200 group`}
          >
            <div className="text-3xl mb-3" aria-hidden="true">{icon}</div>
            <h2 className="font-display text-xl font-semibold text-gold-300 mb-2 group-hover:text-gold-200 transition-colors">
              {title}
            </h2>
            <p className="font-body text-parchment-300 leading-relaxed">
              {description}
            </p>
          </Link>
        ))}
      </div>

      {/* Getting Started */}
      {user && (
        <div className="dnd-card border-l-4 border-gold-700 p-6">
          <h3 className="font-display text-lg font-semibold text-gold-400 mb-3 flex items-center gap-2">
            <span aria-hidden="true">📜</span> Adventurer's Guide
          </h3>
          <ul className="font-body space-y-2 text-parchment-200">
            <li className="flex items-start gap-2">
              <span className="text-gold-500 mt-0.5" aria-hidden="true">◆</span>
              Browse the spell library to see available spells and their damage potential
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold-500 mt-0.5" aria-hidden="true">◆</span>
              Create a spellbook for your character and mark spells as prepared
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold-500 mt-0.5" aria-hidden="true">◆</span>
              Use Compare to find the most effective spell for your next encounter
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gold-500 mt-0.5" aria-hidden="true">◆</span>
              Tune combat parameters — AC, attack bonus, save DC — for precision results
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default HomePage;
