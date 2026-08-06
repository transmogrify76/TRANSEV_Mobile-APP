import React from 'react';
import { IonIcon } from '@ionic/react';
import { person, bookmark, heart, car, time, call, logOut, close } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { logout as logoutApi } from '../services/authApi';
import { clearSession, getMeCached, getUserName } from '../services/session';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  className?: string;
}

const NAV_ITEMS: { icon: string; label: string; path: string }[] = [
  { icon: person, label: 'I am Host', path: '/login' },
  { icon: bookmark, label: 'My Bookings', path: '/bookings' },
  { icon: heart, label: 'Favorites', path: '/favourites' },
  { icon: car, label: 'My Vehicles', path: '/add-vehicle' },
  { icon: time, label: 'Transaction History', path: '/transaction' },
];

const getInitial = (name: string) => (name ? name.trim().charAt(0).toUpperCase() : 'U');

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const history = useHistory();
  const username = getUserName() || '';
  const walletBalance = getMeCached()?.wallet.balance;

  const handleNavigation = (path: string) => {
    history.push(path);
    toggleSidebar();
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error('Error revoking session on logout:', error);
    } finally {
      clearSession();
      history.push('/login');
    }
  };

  return (
    <div
      className={`fixed top-0 left-0 h-[100dvh] w-[80vw] max-w-[300px] bg-white text-ink-800 flex flex-col shadow-2xl z-50 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-500 px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-6 text-white relative">
        <button
          onClick={toggleSidebar}
          className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] right-4 p-1.5 rounded-full bg-white/15 hover:bg-white/25 transition"
          aria-label="Close menu"
        >
          <IonIcon icon={close} className="text-lg" />
        </button>
        <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-xl font-bold mb-3">
          {getInitial(username)}
        </div>
        <h3 className="text-lg font-bold truncate pr-8">{username || 'Guest'}</h3>
        <div className="mt-2 inline-flex items-baseline gap-1 bg-white/15 rounded-full px-3 py-1">
          <span className="text-xs text-white/80">Balance</span>
          <span className="font-semibold text-sm">₹{walletBalance ?? '0.00'}</span>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left text-sm font-medium text-ink-700 hover:bg-brand-50 hover:text-brand-700 active:scale-[0.98] transition"
            onClick={() => handleNavigation(item.path)}
          >
            <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
              <IonIcon icon={item.icon} />
            </span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2 space-y-1 border-t border-ink-100">
        <button
          className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left text-sm font-medium text-ink-700 hover:bg-brand-50 hover:text-brand-700 transition"
          onClick={() => handleNavigation('/help')}
        >
          <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
            <IonIcon icon={call} />
          </span>
          Help &amp; Support
        </button>
        <button
          className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left text-sm font-medium text-red-600 hover:bg-red-50 transition"
          onClick={handleLogout}
        >
          <span className="w-9 h-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
            <IonIcon icon={logOut} />
          </span>
          Log Out
        </button>
        <p className="text-center text-ink-300 text-xs pt-2">v1.0.4</p>
      </div>
    </div>
  );
};

export default Sidebar;
