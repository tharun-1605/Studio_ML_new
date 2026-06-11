import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Image as ImageIcon, Download, Search, CheckCircle2, RefreshCcw } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function ClientPortal() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selfie, setSelfie] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState(null);

  useEffect(() => {
    // Fetch active events
    axios.get(`${API_BASE}/events`).then(res => {
      // Filter out events that aren't ready
      setEvents(res.data.filter(e => e.status === 'completed' || e.mode === 'live'));
    });
  }, []);

  const handleSelfieSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelfie(file);
      setSelfiePreview(URL.createObjectURL(file));
      setMatches(null); // reset matches when new selfie is uploaded
    }
  };

  const handleSearch = async () => {
    if (!selectedEvent || !selfie) return;
    setLoading(true);
    setMatches(null);
    try {
      const formData = new FormData();
      formData.append('event_id', selectedEvent);
      formData.append('file', selfie);
      
      const res = await axios.post(`${API_BASE}/search`, formData);
      setMatches(res.data.matches);
    } catch (err) {
      alert("Failed to search faces. Make sure a clear face is visible.");
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <div className="text-center mb-12 mt-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4"
        >
          Find Your Memories
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.1 }}
          className="text-lg text-muted-foreground"
        >
          Select your event, snap a selfie, and get your photos instantly.
        </motion.p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Step 1: Selection & Upload */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-panel p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span> Select Event</h2>
            <select 
              className="w-full bg-background border border-border rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-primary outline-none"
              value={selectedEvent}
              onChange={e => setSelectedEvent(e.target.value)}
            >
              <option value="" disabled>Choose your event...</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </motion.div>

          <AnimatePresence>
            {selectedEvent && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                className="glass-panel p-6 rounded-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span> Add Your Selfie</h2>
                
                {selfiePreview ? (
                  <div className="relative rounded-xl overflow-hidden group">
                    <img src={selfiePreview} alt="Selfie" className="w-full h-48 object-cover opacity-80" />
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setSelfie(null); setSelfiePreview(null); }} className="px-4 py-2 bg-white text-black font-semibold rounded-lg text-sm">
                        Retake Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors cursor-pointer relative group">
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="user"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={handleSelfieSelect}
                    />
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Camera className="w-8 h-8 text-primary" />
                    </div>
                    <p className="font-medium">Take a Selfie</p>
                    <p className="text-sm text-muted-foreground mt-1">Or upload from gallery</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {selectedEvent && selfie && !matches && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  {loading ? (
                    <><RefreshCcw className="w-5 h-5 animate-spin" /> Analyzing Face...</>
                  ) : (
                    <><Search className="w-5 h-5" /> Find My Photos</>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step 2: Results */}
        <div>
          <AnimatePresence mode="wait">
            {matches !== null && (
              <motion.div 
                key="results"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }}
                className="glass-panel p-6 rounded-2xl h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    Matches Found
                  </h2>
                  <span className="bg-primary/20 text-primary px-3 py-1 rounded-full font-bold">
                    {matches.length} Photos
                  </span>
                </div>

                {matches.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      {matches.map((filename, i) => (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }} 
                          animate={{ opacity: 1, scale: 1 }} 
                          transition={{ delay: i * 0.05 }}
                          key={i} 
                          className="aspect-square rounded-xl overflow-hidden border border-border"
                        >
                          <img 
                            src={`${API_BASE}/photos/${selectedEvent}/${filename}`} 
                            alt={`Match ${i}`} 
                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                          />
                        </motion.div>
                      ))}
                    </div>
                    
                    <button className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-3 rounded-xl font-bold hover:bg-secondary/80 transition-colors">
                      <Download className="w-5 h-5" /> Download All Matches (ZIP)
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <ImageIcon className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">No photos found</h3>
                    <p className="text-muted-foreground">We couldn't find any matching photos in this event.</p>
                  </div>
                )}
              </motion.div>
            )}
            
            {matches === null && (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-2 border-dashed border-border rounded-2xl h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center opacity-50"
              >
                <Search className="w-16 h-16 mb-4" />
                <p className="text-lg">Your matched photos will appear here after search.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
