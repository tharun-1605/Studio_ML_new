import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ClientPortal from './pages/ClientPortal';
import AdminDashboard from './pages/AdminDashboard';
import { Camera } from 'lucide-react';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col font-sans">
        <header className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Camera className="w-6 h-6 text-primary" />
            <span>Studio<span className="text-primary">AI</span></span>
          </Link>
          <nav>
            <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Studio Admin
            </Link>
          </nav>
        </header>
        
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<ClientPortal />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
