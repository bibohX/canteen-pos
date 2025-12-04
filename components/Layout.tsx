import React from 'react';
import { User, Role } from '../types';
import { LogOut, LayoutDashboard, Wallet, ShoppingBag, Users } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentView, onNavigate }) => {
  if (!user) return <>{children}</>;

  const getNavItems = () => {
    switch (user.role) {
      case Role.STUDENT:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'history', label: 'History', icon: Wallet },
        ];
      case Role.STAFF:
        return [
          { id: 'pos', label: 'Point of Sale', icon: ShoppingBag },
        ];
      case Role.ADMIN:
        return [
          { id: 'admin_dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'products', label: 'Products', icon: ShoppingBag },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar / Mobile Header */}
      <div className="bg-indigo-700 text-white md:w-64 flex-shrink-0 flex flex-col justify-between">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-xl">
              S
            </div>
            <span className="text-xl font-bold tracking-tight">SmartCanteen</span>
          </div>

          <div className="flex items-center space-x-3 mb-8 p-3 bg-indigo-800 rounded-lg">
             <div className="w-10 h-10 rounded-full bg-indigo-400 flex items-center justify-center text-lg font-bold">
               {user.full_name?.charAt(0)}
             </div>
             <div className="overflow-hidden">
               <p className="text-sm font-medium truncate">{user.full_name}</p>
               <p className="text-xs text-indigo-200 capitalize">{user.role.toLowerCase()}</p>
             </div>
          </div>

          <nav className="space-y-1">
            {getNavItems().map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? 'bg-white text-indigo-700 font-medium shadow-sm' : 'text-indigo-100 hover:bg-indigo-600'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6 border-t border-indigo-600">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-indigo-200 hover:text-white hover:bg-indigo-600 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col">
        <div className="max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>
        <footer className="mt-8 py-4 text-center">
            <p className="text-slate-400 text-xs font-medium tracking-wide">Powered by Bibohthings™</p>
        </footer>
      </main>
    </div>
  );
};