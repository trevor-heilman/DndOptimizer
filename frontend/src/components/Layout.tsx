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
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo + Nav Links */}
            <div className="flex items-center gap-6">
              <Link
                to="/"
                className="flex items-center gap-2.5 group"
              >
                <span className="text-gold-400 text-xl" aria-hidden="true">⚔️</span>
                <span className="font-display font-bold text-lg text-gold-300 group-hover:text-gold-200 transition-colors tracking-wide">
                  Spellwright
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
                {user?.is_staff && (
                  <NavLink to="/admin/review" className={navLinkClass}>
                    <span aria-hidden="true">🛡️</span> Review
                  </NavLink>
                )}
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
      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-gold-900/30 bg-smoke-950 mt-8 py-4">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-smoke-500">
          <span>Spellwright — an independent D&amp;D 5e spell analysis tool</span>
          <span className="flex items-center gap-3">
            <span>
              Content from SRD 5.1 &amp; SRD 5.2 &copy; Wizards of the Coast LLC,{' '}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-600 hover:text-gold-400 underline"
              >
                CC BY 4.0
              </a>
            </span>
            <Link to="/terms" className="text-gold-600 hover:text-gold-400 underline">
              Terms of Use
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
