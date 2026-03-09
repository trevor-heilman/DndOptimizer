/**
 * Main App Layout Component
 */
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-display font-medium rounded
     border transition-all duration-200
     ${isActive
       ? 'text-gold-300 border-gold-700 bg-gold-950/40'
       : 'text-parchment-300 border-transparent hover:text-gold-300 hover:border-gold-800 hover:bg-smoke-800'
     }`;

  return (
    <div className="min-h-screen bg-smoke-950">
      {/* Navigation */}
      <nav className="bg-smoke-900 border-b border-gold-900/40 shadow-lg shadow-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo + Nav Links */}
            <div className="flex items-center gap-6">
              <Link
                to="/"
                className="flex items-center gap-2.5 group"
              >
                <span className="text-gold-400 text-xl" aria-hidden="true">⚔️</span>
                <span className="font-display font-bold text-lg text-gold-300 group-hover:text-gold-200 transition-colors tracking-wide">
                  DndOptimizer
                </span>
              </Link>

              <div className="hidden sm:flex sm:items-center sm:gap-1">
                <NavLink to="/spells" className={navLinkClass}>
                  <span aria-hidden="true">📖</span> Spells
                </NavLink>
                <NavLink to="/spellbooks" className={navLinkClass}>
                  <span aria-hidden="true">📚</span> Spellbooks
                </NavLink>
                <NavLink to="/compare" className={navLinkClass}>
                  <span aria-hidden="true">⚖️</span> Compare
                </NavLink>
              </div>
            </div>

            {/* User Area */}
            <div className="flex items-center gap-3">
              {user && (
                <>
                  <span className="hidden sm:block text-sm text-smoke-400 font-body italic">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="btn-secondary text-sm px-3 py-1.5"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
