import React, { useState, useEffect } from 'react';
import { User, Role } from './types';
import { supabase } from './services/supabase';
import { Layout } from './components/Layout';
import { StudentDashboard } from './pages/StudentDashboard';
import { StaffPOS } from './pages/StaffPOS';
import { AdminDashboard } from './pages/AdminDashboard';
import { LogIn, User as UserIcon, Lock, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');

  // Login Form State
  const [emailOrId, setEmailOrId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const session = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // If user is logged in, fetch their profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setError('Could not fetch user profile.');
        } else if (profile) {
          setCurrentUser(profile as User);
          // Set default view based on role
          if (profile.role === Role.STUDENT) setCurrentView('dashboard');
          if (profile.role === Role.STAFF) setCurrentView('pos');
          if (profile.role === Role.ADMIN) setCurrentView('admin_dashboard');
        }
      } else {
        // If user is logged out
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => {
      session.data.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailOrId,
      password: password,
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      // The onAuthStateChange listener will handle setting the user
      setEmailOrId('');
      setPassword('');
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    } else {
      setCurrentUser(null);
      setCurrentView('dashboard');
    }
  };

  // Loading screen while checking for session
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-200">
              <LogIn size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome Back</h1>
            <p className="text-slate-500 mt-2">Sign in to Smart Canteen</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email or Student ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon size={18} />
                </div>
                <input
                  type="text"
                  value={emailOrId}
                  onChange={(e) => setEmailOrId(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="e.g. 2024001 or admin@school.edu"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors shadow-sm active:scale-[0.98]"
            >
              Sign In
            </button>
          </form>
        </div>
        
        <footer className="text-center">
           <p className="text-slate-400 text-xs font-medium tracking-wide">Powered by Bibohthings™</p>
        </footer>
      </div>
    );
  }

  // Main App Routing Logic
  const renderContent = () => {
    if (currentUser.role === Role.STUDENT) {
      if (currentView === 'dashboard' || currentView === 'history') {
        return <StudentDashboard user={currentUser} view={currentView} />;
      }
    }
    if (currentUser.role === Role.STAFF) {
      if (currentView === 'pos') return <StaffPOS user={currentUser} />;
    }
    if (currentUser.role === Role.ADMIN) {
      if (currentView === 'admin_dashboard' || currentView === 'users' || currentView === 'products') {
        return <AdminDashboard view={currentView} />;
      }
    }
    return <div>View not found</div>;
  };

  return (
    <Layout
      user={currentUser}
      onLogout={handleLogout}
      currentView={currentView}
      onNavigate={setCurrentView}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;