import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  Compass, 
  Upload, 
  LogIn, 
  UserPlus, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const API_BASE = '/api';

export default function LoginRegister({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login inputs
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Register inputs
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    name: '',
    phone: '',
    referrer: 'Direct Link',
    role: 'guest'
  });
  const [selfieFile, setSelfieFile] = useState(null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const data = new FormData();
      data.append('username', loginForm.username);
      data.append('password', loginForm.password);

      const res = await axios.post(`${API_BASE}/auth/login`, data);
      onLoginSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid login credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (registerForm.password.length < 5) {
      setError('Password must be at least 5 characters long.');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('username', registerForm.username);
      data.append('password', registerForm.password);
      data.append('name', registerForm.name);
      data.append('phone', registerForm.phone);
      data.append('referrer', registerForm.referrer);
      data.append('role', registerForm.role);
      if (selfieFile) {
        data.append('file', selfieFile);
      }

      await axios.post(`${API_BASE}/auth/register`, data);
      
      setSuccessMsg("Registration successful! You can now log in.");
      setIsLogin(true);
      // Pre-fill username
      setLoginForm({ username: registerForm.username, password: '' });
      // Reset registration form
      setRegisterForm({
        username: '',
        password: '',
        name: '',
        phone: '',
        referrer: 'Direct Link',
        role: 'guest'
      });
      setSelfieFile(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Try a different username.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8 max-w-md mx-auto w-full">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 sm:p-8 rounded-3xl w-full border border-white/5 shadow-2xl relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-3">
            <Camera className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">Welcome to StudioAI</h2>
          <p className="text-xs text-gray-400 mt-1">Unlock your custom visual gallery in seconds</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 mb-6">
          <button 
            type="button"
            onClick={() => { setIsLogin(true); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${isLogin ? 'bg-primary text-primary-foreground shadow' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <LogIn className="w-3.5 h-3.5" /> Login
          </button>
          <button 
            type="button"
            onClick={() => { setIsLogin(false); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${!isLogin ? 'bg-primary text-primary-foreground shadow' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Register
          </button>
        </div>

        {/* Feedback Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {isLogin ? (
          /* Login Form */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Username / Email</label>
              <div className="relative">
                <Mail className="w-4.5 h-4.5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-primary transition-all placeholder:text-gray-600"
                  placeholder="name@example.com or username"
                  value={loginForm.username}
                  onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4.5 h-4.5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="password"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-primary transition-all placeholder:text-gray-600"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-extrabold py-3.5 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 text-sm shadow-lg shadow-primary/10 mt-6"
            >
              {loading ? "Authenticating..." : "Access Studio"}
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Username / Email</label>
              <div className="relative">
                <Mail className="w-4.5 h-4.5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-primary transition-all placeholder:text-gray-600"
                  placeholder="Choose username or email"
                  value={registerForm.username}
                  onChange={e => setRegisterForm({...registerForm, username: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4.5 h-4.5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="password"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-primary transition-all placeholder:text-gray-600"
                    placeholder="Min 5 chars"
                    value={registerForm.password}
                    onChange={e => setRegisterForm({...registerForm, password: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4.5 h-4.5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-primary transition-all placeholder:text-gray-600"
                    placeholder="Your name"
                    value={registerForm.name}
                    onChange={e => setRegisterForm({...registerForm, name: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">WhatsApp Number</label>
                <div className="relative">
                  <Phone className="w-4.5 h-4.5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="tel"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-primary transition-all placeholder:text-gray-600"
                    placeholder="e.g. +919876543210"
                    value={registerForm.phone}
                    onChange={e => setRegisterForm({...registerForm, phone: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">How'd you find us?</label>
                <div className="relative">
                  <Compass className="w-4.5 h-4.5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select 
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                    value={registerForm.referrer}
                    onChange={e => setRegisterForm({...registerForm, referrer: e.target.value})}
                  >
                    <option value="Direct Link" className="bg-[#0f0f13]">Direct Link</option>
                    <option value="Google Search" className="bg-[#0f0f13]">Google Search</option>
                    <option value="Instagram" className="bg-[#0f0f13]">Instagram</option>
                    <option value="Facebook" className="bg-[#0f0f13]">Facebook</option>
                    <option value="Friend / Word of Mouth" className="bg-[#0f0f13]">Friend / Word of Mouth</option>
                    <option value="Other" className="bg-[#0f0f13]">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Upload Profile Selfie <span className="text-[9px] text-gray-500 font-normal">(Used for instant photo matching)</span></label>
              <div className="border border-dashed border-white/10 rounded-xl p-3.5 text-center hover:border-primary/50 transition-colors relative cursor-pointer group bg-black/20">
                <input 
                  type="file" 
                  accept="image/*" 
                  required
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={e => setSelfieFile(e.target.files[0])}
                />
                <Upload className="w-5 h-5 mx-auto mb-1 text-gray-500 group-hover:text-primary transition-colors" />
                <span className="text-xs text-gray-400 truncate block max-w-full font-medium">{selfieFile ? selfieFile.name : "Select selfie image..."}</span>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-extrabold py-3.5 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 text-sm shadow-lg shadow-primary/10 mt-6"
            >
              {loading ? "Registering account..." : "Create Account"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
