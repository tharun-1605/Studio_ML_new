import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Image as ImageIcon, 
  Download, 
  Search, 
  CheckCircle2, 
  RefreshCcw, 
  User, 
  Phone, 
  Compass, 
  Eye, 
  ArrowRight, 
  AlertCircle, 
  Sparkles,
  X
} from 'lucide-react';

const API_BASE = '/api';

const REFERRAL_OPTIONS = [
  { value: 'Google Search', label: 'Google / Search Engine' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Friend / Word of Mouth', label: 'Friend / Word of Mouth' },
  { value: 'Direct / Email Invite', label: 'Direct / Email Invite' },
  { value: 'Other', label: 'Other / Internet Search' }
];

export default function ClientPortal({ user }) {
  const { eventId } = useParams();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(eventId || '');
  const [eventDetails, setEventDetails] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [matches, setMatches] = useState(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [referrer, setReferrer] = useState('Direct / Email Invite');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  // Validation States
  const [errors, setErrors] = useState({});
  
  // Lightbox Modal State
  const [activePhoto, setActivePhoto] = useState(null);

  useEffect(() => {
    if (eventId) {
      setSelectedEvent(eventId);
      axios.get(`${API_BASE}/events/${eventId}`)
        .then(res => {
          setEventDetails(res.data);
        })
        .catch(err => {
          console.error("Failed to fetch event details", err);
        });
    } else {
      // Fetch all active/pending events if no eventId is in URL
      axios.get(`${API_BASE}/events`).then(res => {
        setEvents(res.data.filter(e => e.status !== 'failed'));
      });
    }

    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setReferrer(user.referrer || 'Direct / Email Invite');
      if (user.selfie_path) {
        setSelfiePreview(`${API_BASE}/auth/selfie/${user.username}`);
      }
    } else {
      // Detect Referrer only if not a logged-in user
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref') || params.get('utm_source') || params.get('source');
      
      if (refParam) {
        const match = REFERRAL_OPTIONS.find(o => o.value.toLowerCase() === refParam.toLowerCase() || o.label.toLowerCase().includes(refParam.toLowerCase()));
        if (match) {
          setReferrer(match.value);
        } else {
          setReferrer(refParam);
        }
      } else if (document.referrer) {
        try {
          const url = new URL(document.referrer);
          if (url.hostname.includes('google')) {
            setReferrer('Google Search');
          } else if (url.hostname.includes('facebook') || url.hostname.includes('fb')) {
            setReferrer('Facebook');
          } else if (url.hostname.includes('instagram') || url.hostname.includes('ig')) {
            setReferrer('Instagram');
          } else if (url.hostname.includes('twitter') || url.hostname.includes('t.co')) {
            setReferrer('Other');
          } else if (url.hostname.includes('linkedin')) {
            setReferrer('Other');
          }
        } catch (e) {
          // Safe fallback
        }
      }
    }
  }, [user, eventId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActivePhoto(null);
      }
    };
    if (activePhoto) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePhoto]);

  const handleSelfieSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelfie(file);
      setSelfiePreview(URL.createObjectURL(file));
      setMatches(null); // reset matches
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Please enter your full name';
    } else if (name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }

    const phoneRegex = /^[0-9]{10}$/;
    const cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
    if (!phone.trim()) {
      newErrors.phone = 'Please enter your WhatsApp number';
    } else if (!phoneRegex.test(cleanPhone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUserSearch = async () => {
    if (!selectedEvent || !user) return;

    setLoading(true);
    setMatches(null);
    setRegistrationSuccess(false);
    setLoadingStep(1); // Connecting to event database

    try {
      const regData = new FormData();
      regData.append('username', user.username);
      
      setLoadingStep(2); // Ingesting AI facial landmarks
      // Subscribe user as guest for the event
      const regRes = await axios.post(`${API_BASE}/events/${selectedEvent}/register-guest-user`, regData);
      
      setLoadingStep(3); // Matching faces with gallery
      
      setRegistrationSuccess(true);
      
      if (regRes.data && Array.isArray(regRes.data.matches)) {
        setTimeout(() => {
          setMatches(regRes.data.matches);
          setLoading(false);
        }, 1500);
      } else {
        const searchRes = await axios.post(`${API_BASE}/events/${selectedEvent}/search-user-selfie`, regData);
        setTimeout(() => {
          setMatches(searchRes.data.matches || []);
          setLoading(false);
        }, 1500);
      }
    } catch (err) {
      setLoading(false);
      alert("Failed to find photos. Please verify your profile picture is set up correctly.");
    }
  };

  const handleRegister = async () => {
    if (!selectedEvent || !selfie) return;
    if (!validateForm()) return;

    setLoading(true);
    setMatches(null);
    setRegistrationSuccess(false);
    
    // Animate loader steps
    setLoadingStep(1); // Uploading
    
    try {
      // 1. Register Guest
      const regData = new FormData();
      regData.append('event_id', selectedEvent);
      regData.append('name', name);
      regData.append('phone', '+91' + phone.trim());
      regData.append('file', selfie);
      regData.append('referrer', referrer);
      
      setTimeout(() => setLoadingStep(2), 1200); // AI Face recognition running
      
      const res = await axios.post(`${API_BASE}/guests/register`, regData);
      
      setTimeout(() => setLoadingStep(3), 2400); // Searching photo library
      
      setRegistrationSuccess(true);
      
      if (res.data && Array.isArray(res.data.matches)) {
        setTimeout(() => {
          setMatches(res.data.matches);
          setLoading(false);
        }, 3600);
      } else {
        // Fallback: Check if event is already completed/live
        const evt = events.find(e => e.id === selectedEvent);
        if (evt && (evt.status === 'completed' || evt.mode === 'live')) {
          const searchData = new FormData();
          searchData.append('event_id', selectedEvent);
          searchData.append('file', selfie);
          const searchRes = await axios.post(`${API_BASE}/search`, searchData);
          setTimeout(() => {
            setMatches(searchRes.data.matches);
            setLoading(false);
          }, 3600);
        } else {
          setTimeout(() => {
            setMatches([]);
            setLoading(false);
          }, 3600);
        }
      }
    } catch (err) {
      setLoading(false);
      alert("Failed to register. Please check your connection and try again.");
    }
  };

  const handleDownloadAll = async () => {
    if (!matches || matches.length === 0) return;
    // In a real application, you might trigger a ZIP creation or download each photo
    // For local UX, we will open each photo in a new tab or trigger downloads
    alert("Starting download of " + matches.length + " matching photos!");
    matches.forEach(filename => {
      const link = document.createElement('a');
      link.href = `${API_BASE}/photos/${selectedEvent}/${filename}`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      {/* Lightbox Modal */}
      <AnimatePresence>
        {activePhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setActivePhoto(null)}
          >
            <button 
              onClick={() => setActivePhoto(null)} 
              className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-300 hover:scale-105 z-[110]"
              title="Close (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={`${API_BASE}/photos/${selectedEvent}/${activePhoto}`} 
                alt="Enlarged memory" 
                className="max-w-full max-h-[75vh] object-contain rounded-t-2xl"
              />
              <div className="bg-[#12111d] p-4 flex justify-between items-center border-t border-white/5">
                <span className="text-sm text-gray-400 font-mono">{activePhoto}</span>
                <a 
                  href={`${API_BASE}/photos/${selectedEvent}/${activePhoto}`} 
                  download 
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download Photo
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center mb-12 mt-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold tracking-wider uppercase mb-6"
        >
          <Sparkles className="w-3.5 h-3.5" /> Instant Delivery Engine
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-4xl md:text-6xl font-black tracking-tight mb-4"
        >
          {eventDetails ? (
            <>Photos from <span className="text-gradient">{eventDetails.name}</span></>
          ) : user ? (
            <>Welcome, <span className="text-gradient">{user.name.split(' ')[0]}</span></>
          ) : (
            <>Find Your <span className="text-gradient">Memories</span></>
          )}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.15 }}
          className="text-lg text-gray-400 max-w-2xl mx-auto"
        >
          No more waiting for photo links. Snap a selfie, and let our facial recognition system deliver matching photos straight to your WhatsApp.
        </motion.p>
      </div>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        {/* Step 1: Selection & Upload */}
        <div className="md:col-span-6 space-y-6">
          {/* Step 1 Card: Select Event */}
          {!eventId && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="glass-panel p-6 rounded-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-violet-500 to-indigo-600"></div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
                <span className="bg-primary/20 text-primary w-7 h-7 rounded-xl flex items-center justify-center text-sm font-extrabold border border-primary/20">1</span>
                Select Your Event
              </h2>
              <div className="relative">
                <select 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 appearance-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-gray-200 cursor-pointer"
                  value={selectedEvent}
                  onChange={e => {
                    setSelectedEvent(e.target.value);
                    setMatches(null);
                    setRegistrationSuccess(false);
                  }}
                >
                  <option value="" disabled className="bg-[#12111d] text-gray-400">Choose from current events...</option>
                  {events.map(e => (
                    <option key={e.id} value={e.id} className="bg-[#12111d] text-gray-200">{e.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2 Card: Details / Profile Matcher */}
          <AnimatePresence>
            {selectedEvent && (
              user ? (
                <motion.div 
                  initial={{ opacity: 0, height: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  className="glass-panel p-6 rounded-2xl relative overflow-hidden space-y-5"
                >
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-fuchsia-600"></div>
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    <span className="bg-primary/20 text-primary w-7 h-7 rounded-xl flex items-center justify-center text-sm font-extrabold border border-primary/20">{eventId ? '1' : '2'}</span>
                    Face Matcher Profile
                  </h2>
                  
                  <div className="flex gap-4 items-center bg-black/20 p-4 rounded-xl border border-white/5">
                    {selfiePreview ? (
                      <img 
                        src={selfiePreview} 
                        alt="Your selfie" 
                        className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0" 
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20 shrink-0">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold text-white truncate text-base">{user.name}</h3>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">{user.phone}</p>
                      <span className="inline-block mt-1.5 text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold uppercase">
                        {user.referrer || 'Direct Guest'}
                      </span>
                    </div>
                  </div>
                  {!registrationSuccess && !loading && (
                    <button 
                      onClick={handleUserSearch}
                      className="w-full bg-primary text-primary-foreground font-bold text-base py-3.5 rounded-xl flex items-center justify-center gap-2.5 hover:bg-primary/95 transition-all shadow-xl shadow-primary/20 glow-btn"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Search Event & Enable WhatsApp Delivery
                    </button>
                  )}
                </motion.div>
              ) : (
                /* Regular Guest Registration Form */
                <>
                  <motion.div 
                    initial={{ opacity: 0, height: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    className="glass-panel p-6 rounded-2xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 to-fuchsia-600"></div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
                      <span className="bg-primary/20 text-primary w-7 h-7 rounded-xl flex items-center justify-center text-sm font-extrabold border border-primary/20">{eventId ? '1' : '2'}</span>
                      Guest Information
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-gray-400 flex items-center gap-2">
                          <User className="w-4 h-4 text-violet-400" /> Full Name
                        </label>
                        <input 
                          type="text" 
                          className={`w-full bg-black/40 border ${errors.name ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 focus:border-primary outline-none transition-all text-gray-100 placeholder:text-gray-600`}
                          value={name}
                          onChange={e => {
                            setName(e.target.value);
                            if (errors.name) setErrors({...errors, name: null});
                          }}
                          placeholder="e.g. Jane Doe"
                        />
                        {errors.name && (
                          <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {errors.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-gray-400 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-violet-400" /> WhatsApp Number
                        </label>
                        <div className="flex rounded-xl border border-white/10 bg-black/40 overflow-hidden focus-within:border-primary transition-all">
                          <span className="bg-white/5 px-4 py-3 text-gray-400 border-r border-white/10 flex items-center justify-center font-mono font-bold text-sm select-none">
                            +91
                          </span>
                          <input 
                            type="tel" 
                            className="w-full bg-transparent px-4 py-3 outline-none text-gray-100 placeholder:text-gray-600 text-sm"
                            value={phone}
                            onChange={e => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setPhone(val);
                              if (errors.phone) setErrors({...errors, phone: null});
                            }}
                            placeholder="9876543210"
                            maxLength={10}
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-gray-500">Enter your 10-digit mobile number.</p>
                        {errors.phone && (
                          <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {errors.phone}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-gray-400 flex items-center gap-2">
                          <Compass className="w-4 h-4 text-violet-400" /> How did you find this event?
                        </label>
                        <select
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 appearance-none focus:border-primary outline-none transition-all text-gray-200 cursor-pointer"
                          value={referrer}
                          onChange={e => setReferrer(e.target.value)}
                        >
                          {REFERRAL_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value} className="bg-[#12111d] text-gray-200">{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>

                  {/* Step 3 Card: Selfie Upload */}
                  {selectedEvent && name.trim().length >= 2 && phone.trim().length >= 6 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, scale: 0.95 }} 
                      animate={{ opacity: 1, height: 'auto', scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.95 }}
                      className="glass-panel p-6 rounded-2xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-fuchsia-500 to-pink-500"></div>
                      <h2 className="text-xl font-bold mb-4 flex items-center gap-3">
                        <span className="bg-primary/20 text-primary w-7 h-7 rounded-xl flex items-center justify-center text-sm font-extrabold border border-primary/20">{eventId ? '2' : '3'}</span>
                        Upload Selfie
                      </h2>
                      
                      {selfiePreview ? (
                        <div className="relative rounded-2xl overflow-hidden group border border-white/10">
                          <img src={selfiePreview} alt="Selfie preview" className="w-full h-56 object-cover brightness-90 group-hover:brightness-75 transition-all duration-300" />
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-3">
                            <button 
                              onClick={() => { setSelfie(null); setSelfiePreview(null); }} 
                              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm transition-colors shadow-lg"
                            >
                              Choose Different Photo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-primary/50 transition-all cursor-pointer relative group bg-black/20 hover:bg-black/40">
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="user"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={handleSelfieSelect}
                          />
                          <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 group-hover:bg-primary/20 transition-all duration-300 border border-primary/20">
                            <Camera className="w-8 h-8 text-primary" />
                          </div>
                          <p className="font-bold text-gray-200 group-hover:text-primary transition-colors">Capture or Upload Selfie</p>
                          <p className="text-sm text-gray-500 mt-1">Make sure your face is clearly visible and well-lit.</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  {selectedEvent && name && phone && selfie && !registrationSuccess && !loading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                    >
                      <button 
                        onClick={handleRegister}
                        className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-primary/95 transition-all shadow-xl shadow-primary/20 glow-btn"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Let's Find My Photos
                      </button>
                    </motion.div>
                  )}
                </>
              )
            )}
          </AnimatePresence>
        </div>

        {/* Step 2: Results & Feedback */}
        <div className="md:col-span-6 h-full">
          <AnimatePresence mode="wait">
            {/* Loading Board */}
            {loading && (
              <motion.div
                key="loading-board"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-panel p-8 rounded-2xl border border-primary/20 bg-[#0d0c16]/90 min-h-[400px] flex flex-col justify-between"
              >
                <div className="text-center py-6">
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/10"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"></div>
                    <Camera className="w-8 h-8 text-primary absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Analyzing Face</h3>
                  <p className="text-sm text-gray-400 max-w-sm mx-auto">Our AI engine is matching your facial landmarks with the event gallery database.</p>
                </div>

                {/* Tech steps */}
                <div className="space-y-3.5 border-t border-white/5 pt-6 max-w-md mx-auto w-full">
                  <div className="flex items-center gap-3.5 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${loadingStep >= 1 ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-gray-600'}`}>
                      {loadingStep > 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '1'}
                    </div>
                    <span className={loadingStep >= 1 ? 'text-gray-200 font-semibold' : 'text-gray-500'}>Uploading secure guest registry...</span>
                  </div>
                  
                  <div className="flex items-center gap-3.5 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${loadingStep >= 2 ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-gray-600'}`}>
                      {loadingStep > 2 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '2'}
                    </div>
                    <span className={loadingStep >= 2 ? 'text-gray-200 font-semibold' : 'text-gray-500'}>Generating AI face facial-encoding vector...</span>
                  </div>
                  
                  <div className="flex items-center gap-3.5 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${loadingStep >= 3 ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-gray-600'}`}>
                      {loadingStep > 3 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '3'}
                    </div>
                    <span className={loadingStep >= 3 ? 'text-gray-200 font-semibold' : 'text-gray-500'}>Scanning matches in event library database...</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Match results board */}
            {!loading && matches !== null && (
              <motion.div 
                key="results-board"
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-6 rounded-2xl flex flex-col min-h-[450px]"
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2.5">
                      <Sparkles className="w-6 h-6 text-yellow-400" />
                      Matches Found
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">Faces matched using 128-d Euclidean embeddings</p>
                  </div>
                  <span className="bg-primary/20 text-primary px-3 py-1.5 rounded-full font-bold text-sm border border-primary/25">
                    {matches.length} Photos
                  </span>
                </div>

                {matches.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 overflow-y-auto max-h-[380px] pr-1.5 custom-scrollbar">
                      {matches.map((filename, i) => (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }} 
                          animate={{ opacity: 1, scale: 1 }} 
                          transition={{ delay: i * 0.05 }}
                          key={filename} 
                          className="group relative aspect-square rounded-xl overflow-hidden border border-white/5 bg-black/40 cursor-pointer"
                          onClick={() => setActivePhoto(filename)}
                        >
                          <img 
                            src={`${API_BASE}/photos/${selectedEvent}/${filename}`} 
                            alt={`Matched ${i}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2.5 justify-between">
                            <span className="text-[10px] text-gray-300 truncate max-w-[70%] font-mono">{filename}</span>
                            <div className="flex gap-1.5">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivePhoto(filename);
                                }}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    
                    <button 
                      onClick={handleDownloadAll}
                      className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg shadow-indigo-600/10"
                    >
                      <Download className="w-5 h-5" /> Download All Photos
                    </button>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-white/10">
                      <ImageIcon className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-1">No matching photos</h3>
                    <p className="text-gray-400 text-sm max-w-xs">We scanned all processed photos in this event but couldn't locate your face. If photos are still being uploaded, we will deliver them via WhatsApp automatically.</p>
                  </div>
                )}
              </motion.div>
            )}
            
            {/* Registration Successful placeholder (when matches list hasn't finished checking/scanning) */}
            {registrationSuccess && matches === null && !loading && (
              <motion.div 
                key="success-board"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-8 rounded-2xl min-h-[400px] flex flex-col items-center justify-center text-center bg-emerald-500/5 border-emerald-500/15"
              >
                <div className="bg-emerald-500/10 p-4 rounded-full mb-6 border border-emerald-500/20 animate-bounce">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-black text-emerald-400 mb-3">Successfully Registered!</h3>
                <p className="text-gray-300 max-w-sm mb-2 text-sm leading-relaxed">
                  We've successfully registered you for <span className="text-white font-bold">{eventDetails ? eventDetails.name : events.find(e => e.id === selectedEvent)?.name}</span>.
                </p>
                <p className="text-gray-400 max-w-xs text-xs">
                  We'll automatically match any incoming photos with your face vector and send the links directly to your WhatsApp at <span className="text-white font-semibold">{phone}</span>!
                </p>
              </motion.div>
            )}
            
            {/* Initial placeholder before step completion */}
            {!registrationSuccess && matches === null && !loading && (
              <motion.div 
                key="placeholder-board"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border border-dashed border-white/10 rounded-2xl min-h-[400px] flex flex-col items-center justify-center text-gray-500 p-8 text-center bg-black/10"
              >
                <Search className="w-14 h-14 mb-4 text-gray-600 animate-pulse" />
                <h3 className="text-lg font-bold text-gray-400 mb-1">Your Photo Grid</h3>
                <p className="text-sm text-gray-500 max-w-xs">Complete the 3 registration steps on the left to see your matched photos in real-time.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

