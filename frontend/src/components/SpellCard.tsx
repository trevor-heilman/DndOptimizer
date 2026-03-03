/**
 * Spell Card Component
 */
import { Link } from 'react-router-dom';
import type { Spell } from '../types/api';

interface SpellCardProps {
  spell: Spell;
}

export function SpellCard({ spell }: SpellCardProps) {
  const levelText = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`;
  const schoolText = spell.school.charAt(0).toUpperCase() + spell.school.slice(1)

  return (
    <Link
      to={`/spells/${spell.id}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 p-4"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{spell.name}</h3>
        {spell.concentration && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            Concentration
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
        <span className="bg-primary-100 text-primary-800 px-2 py-0.5 rounded">
          {levelText}
        </span>
        <span>{schoolText}</span>
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{spell.description}</p>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>Cast: {spell.casting_time}</span>
        <span>Range: {spell.range}</span>
        {spell.ritual && <span className="text-purple-600">Ritual</span>}
      </div>

      {spell.damage_components && spell.damage_components.length > 0 && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {spell.damage_components.slice(0, 3).map((dc, idx) => (
            <span key={idx} className="bg-red-100 text-red-800 px-2 py-0.5 rounded">
              {dc.dice_count}d{dc.die_size} {dc.damage_type}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export default SpellCard;
