/**
 * Home/Dashboard Page
 */
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to DndOptimizer
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Optimize your D&D 5e spell selections with mathematical precision
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/spells"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Spell Library</h2>
          <p className="text-gray-600">
            Browse, search, and manage your spell collection
          </p>
        </Link>

        <Link
          to="/spellbooks"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Spellbooks</h2>
          <p className="text-gray-600">
            Create and organize prepared spell lists for your characters
          </p>
        </Link>

        <Link
          to="/compare"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Compare Spells</h2>
          <p className="text-gray-600">
            Analyze and compare spell effectiveness in different scenarios
          </p>
        </Link>
      </div>

      {user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Getting Started
          </h3>
          <ul className="list-disc list-inside space-y-2 text-blue-800">
            <li>Browse the spell library to see available spells</li>
            <li>Create a spellbook for your character</li>
            <li>Add spells to your spellbook and mark them as prepared</li>
            <li>Compare spells to find the most effective options</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default HomePage;
