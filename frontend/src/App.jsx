import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import ClientPortal from './pages/ClientPortal';
import AdminDashboard from './pages/AdminDashboard';
import LoginRegister from './pages/LoginRegister';
import { Camera, ShieldAlert, Cpu, Heart, CheckCircle, LogOut } from 'lucide-react';
import axios from 'axios';

function Navigation({ user, onLogout }) {
  const [isOnline, setIsOnline] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await axios.get('/api/events');
        setIsOnline(true);
      } catch (err) {
        setIsOnline(false);
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#0b0b0f]/80 backdrop-blur-md">
      <Link to="/" className="flex items-center gap-2.5 text-xl font-black tracking-tight group">
        <div className="bg-primary p-2 rounded-xl text-primary-foreground shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
          <Camera className="w-5 h-5" />
        </div>
        <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400">
          Studio<span className="text-primary font-black">AI</span>
        </span>
      </Link>
      
      <div className="flex items-center gap-6">
        {/* User Info Tag */}
        {user && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
            <span className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] text-primary font-bold">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span className="font-medium">{user.name}</span>
            <span className="text-[9px] bg-white/10 text-gray-400 border border-white/5 px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
              {user.role === 'admin' ? 'Admin' : 'Guest'}
            </span>
          </div>
        )}

        {/* Status Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium">
          {isOnline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-gray-300">System Connected</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-rose-400">System Offline</span>
            </>
          )}
        </div>

        <nav className="flex items-center gap-4">
          {user && user.role === 'admin' && (
            location.pathname === '/admin' ? (
              <Link 
                to="/" 
                className="text-sm font-semibold px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/5 transition-all"
              >
                Guest Portal
              </Link>
            ) : (
              <Link 
                to="/admin" 
                className="text-sm font-semibold px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 transition-all"
              >
                Admin Dashboard
              </Link>
            )
          )}
          {user && (
            <button 
              onClick={onLogout}
              className="text-sm font-semibold px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/30 transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[#0b0b0f] text-gray-100 bg-mesh selection:bg-primary/30 selection:text-white">
        <Navigation user={user} onLogout={handleLogout} />
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative z-10">
          <Routes>
            <Route path="/event/:eventId" element={<ClientPortal user={user} />} />
            {!user ? (
              <Route path="*" element={<LoginRegister onLoginSuccess={handleLoginSuccess} />} />
            ) : (
              <>
                <Route path="/" element={<ClientPortal user={user} />} />
                <Route 
                  path="/admin" 
                  element={user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" replace />} 
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </main>
        
        {/* Footer */}
        <footer className="border-t border-white/5 py-8 mt-12 bg-black/40">
          <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Camera className="w-4 h-4 text-primary" />
              <span>&copy; {new Date().getFullYear()} StudioAI. All memories secured.</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for photographers
              </span>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;

