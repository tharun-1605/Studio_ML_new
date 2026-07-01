import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Link as LinkIcon, 
  RefreshCcw, 
  FolderArchive, 
  Trash2, 
  Search,
  Users, 
  Camera, 
  Plus, 
  Calendar,
  Layers, 
  Smile, 
  Info,
  Clock,
  Compass,
  CheckCircle2,
  XCircle
} from 'lucide-react';

const API_BASE = '/api';

export default function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', mode: 'archive', drive_link: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Custom added states
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [uploadingZipId, setUploadingZipId] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/events`);
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadZip = async (eventId, file) => {
    if (!file) return;
    setUploadingZipId(eventId);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      await axios.post(`${API_BASE}/events/${eventId}/upload-zip`, uploadData);
      fetchEvents();
    } catch (err) {
      alert("Failed to upload ZIP");
    } finally {
      setUploadingZipId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 3) {
      alert("Event name must be at least 3 characters");
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('mode', form.mode);
      if (form.mode === 'live') formData.append('drive_link', form.drive_link);
      
      const res = await axios.post(`${API_BASE}/events`, formData);
      
      if (form.mode === 'archive' && selectedFile) {
        const uploadData = new FormData();
        uploadData.append('file', selectedFile);
        await axios.post(`${API_BASE}/events/${res.data.id}/upload-zip`, uploadData);
      }
      
      setForm({ name: '', mode: 'archive', drive_link: '' });
      setSelectedFile(null);
      fetchEvents();
    } catch (err) {
      alert("Failed to create event");
    }
    setLoading(false);
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event? This will also delete all associated photos and vectors.")) return;
    try {
      await axios.delete(`${API_BASE}/events/${eventId}`);
      if (expandedEventId === eventId) {
        setExpandedEventId(null);
        setGuests([]);
      }
      fetchEvents();
    } catch (err) {
      alert("Failed to delete event");
    }
  };

  const handleToggleExpand = async (eventId) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
      setGuests([]);
    } else {
      setExpandedEventId(eventId);
      setLoadingGuests(true);
      try {
        const res = await axios.get(`${API_BASE}/events/${eventId}/guests`);
        setGuests(res.data);
      } catch (err) {
        console.error("Failed to load guests", err);
      }
      setLoadingGuests(false);
    }
  };

  // Calculations
  const totalPhotos = events.reduce((sum, e) => sum + (e.photo_count || 0), 0);
  const liveCount = events.filter(e => e.mode === 'live').length;
  const archiveCount = events.filter(e => e.mode === 'archive').length;

  const filteredEvents = events.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getReferrerColor = (ref) => {
    if (!ref) return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    const lower = ref.toLowerCase();
    if (lower.includes('google')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (lower.includes('instagram')) return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
    if (lower.includes('facebook')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    if (lower.includes('whatsapp')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (lower.includes('friend') || lower.includes('mouth')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      {/* Header operations bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 mt-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Studio Operations</h1>
          <p className="text-sm text-gray-400 mt-1">Manage events, ingest photo libraries, and monitor guest deliveries.</p>
        </div>
        <button 
          onClick={fetchEvents} 
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-gray-200 transition-all font-semibold"
        >
          <RefreshCcw className="w-4.5 h-4.5" /> Refresh Dashboard
        </button>
      </div>

      {/* Analytics stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Events</span>
            <Layers className="w-5 h-5 text-violet-400" />
          </div>
          <p className="text-2xl font-black">{events.length}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-panel p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Photos</span>
            <Camera className="w-5 h-5 text-pink-400" />
          </div>
          <p className="text-2xl font-black">{totalPhotos}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Live Links (Drive)</span>
            <LinkIcon className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-black">{liveCount}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-panel p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Archive Zips</span>
            <FolderArchive className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-black">{archiveCount}</p>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        {/* Left Side: Create form */}
        <div className="md:col-span-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="glass-panel p-6 rounded-2xl border border-white/5"
          >
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Create Event
            </h2>
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-gray-400">Event Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-all text-gray-100 placeholder:text-gray-600 text-sm"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g. Smith Wedding"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-400">Ingest Mode</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button 
                    type="button"
                    onClick={() => setForm({...form, mode: 'archive'})}
                    className={`flex flex-col items-center justify-center p-3.5 border rounded-xl transition-all ${form.mode === 'archive' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-gray-500 hover:border-white/20'}`}
                  >
                    <FolderArchive className="w-5 h-5 mb-1.5" />
                    <span className="text-xs font-bold">Archive (ZIP)</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setForm({...form, mode: 'live'})}
                    className={`flex flex-col items-center justify-center p-3.5 border rounded-xl transition-all ${form.mode === 'live' ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-gray-500 hover:border-white/20'}`}
                  >
                    <LinkIcon className="w-5 h-5 mb-1.5" />
                    <span className="text-xs font-bold">Live (Drive)</span>
                  </button>
                </div>
              </div>

              {form.mode === 'live' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-sm font-semibold mb-1.5 text-gray-400">Google Drive Folder Link</label>
                  <input 
                    type="url" 
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-primary outline-none transition-all text-gray-100 placeholder:text-gray-600 text-sm"
                    value={form.drive_link}
                    onChange={e => setForm({...form, drive_link: e.target.value})}
                    placeholder="https://drive.google.com/..."
                  />
                </motion.div>
              )}

              {form.mode === 'archive' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-sm font-semibold mb-1.5 text-gray-400">Upload Initial Photos (ZIP) <span className="text-xs font-normal text-gray-500">(Optional)</span></label>
                  <div className="border border-dashed border-white/10 rounded-xl p-5 text-center hover:border-primary/50 transition-colors relative cursor-pointer group bg-black/20">
                    <input 
                      type="file" 
                      accept=".zip" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={e => setSelectedFile(e.target.files[0])}
                    />
                    <Upload className="w-7 h-7 mx-auto mb-2 text-gray-500 group-hover:text-primary transition-colors" />
                    <span className="text-xs text-gray-400 truncate block max-w-full font-medium">{selectedFile ? selectedFile.name : "Choose ZIP package..."}</span>
                  </div>
                </motion.div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 text-sm shadow-lg shadow-primary/10"
              >
                {loading ? "Initializing Event..." : "Create Event Room"}
              </button>
            </form>
          </motion.div>
        </div>

        {/* Right Side: Event list */}
        <div className="md:col-span-8 space-y-4">
          {/* Search bar */}
          <div className="relative mb-6">
            <Search className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              className="w-full bg-black/30 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none text-gray-100 placeholder:text-gray-500 text-sm transition-all"
              placeholder="Search event rooms by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center p-12 text-gray-500 border border-dashed border-white/10 rounded-2xl bg-black/5">
                No events found matching your search.
              </div>
            ) : (
              filteredEvents.map((evt, idx) => (
                <div key={evt.id} className="glass-panel rounded-2xl overflow-hidden border border-white/5">
                  <div 
                    onClick={() => handleToggleExpand(evt.id)}
                    className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div>
                      <h3 className="font-extrabold text-lg text-gray-100 flex items-center gap-2">
                        {evt.name}
                        {evt.mode === 'live' ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 text-[10px] uppercase font-bold tracking-wider">Live</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/15 text-[10px] uppercase font-bold tracking-wider">Archive</span>
                        )}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5 text-violet-400" /> {evt.photo_count} Photos</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-violet-400" /> {new Date(evt.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                        evt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' :
                        evt.status === 'processing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/15 animate-pulse' :
                        evt.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/15' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/15'
                      }`}>
                        {evt.status.toUpperCase()}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = `${window.location.origin}/event/${evt.id}`;
                            navigator.clipboard.writeText(url);
                            alert("Copied shareable event link to clipboard!");
                          }}
                          className="text-emerald-400 hover:text-emerald-300 border border-emerald-500/10 hover:border-emerald-500/30 transition-colors p-2 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 flex items-center justify-center"
                          title="Copy Share Link"
                        >
                          <LinkIcon className="w-4 h-4" />
                        </button>
                        {evt.mode === 'archive' && (evt.status === 'pending' || evt.status === 'completed') && (
                          <label className="text-gray-300 hover:text-white transition-colors p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 cursor-pointer flex items-center justify-center" title="Upload Event ZIP">
                            {uploadingZipId === evt.id ? (
                              <RefreshCcw className="w-4 h-4 animate-spin text-primary" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                            <input 
                              type="file" 
                              accept=".zip" 
                              className="hidden" 
                              disabled={uploadingZipId === evt.id}
                              onChange={e => handleUploadZip(evt.id, e.target.files[0])} 
                            />
                          </label>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(evt.id);
                          }} 
                          className="text-rose-400 hover:text-rose-300 border border-rose-500/10 hover:border-rose-500/30 transition-colors p-2 rounded-xl bg-rose-500/5 hover:bg-rose-500/10" 
                          title="Delete Event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Guest Section */}
                  <AnimatePresence>
                    {expandedEventId === evt.id && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-black/30 border-t border-white/5 p-5"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold text-gray-200 flex items-center gap-1.5">
                            <Users className="w-4.5 h-4.5 text-primary" /> Registered Guests
                          </h4>
                          <span className="text-xs text-gray-400 font-medium">Click to collapse</span>
                        </div>

                        {loadingGuests ? (
                          <div className="flex items-center justify-center py-8 text-xs text-gray-500 gap-2">
                            <RefreshCcw className="w-4 h-4 animate-spin" /> Loading guest list...
                          </div>
                        ) : guests.length === 0 ? (
                          <div className="text-center py-6 text-xs text-gray-500 flex items-center justify-center gap-2">
                            <Info className="w-4 h-4" /> No guests registered for this event yet.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-white/5 text-[10px] text-gray-400 uppercase font-black">
                                  <th className="py-2.5">Guest Name</th>
                                  <th className="py-2.5">WhatsApp</th>
                                  <th className="py-2.5">Referral Source</th>
                                  <th className="py-2.5">Registered On</th>
                                  <th className="py-2.5 text-right">WhatsApp Sent</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                                {guests.map(guest => (
                                  <tr key={guest.id} className="hover:bg-white/5 transition-colors">
                                    <td className="py-3 font-semibold text-white flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center text-[10px] text-primary font-bold">
                                        {guest.name.charAt(0).toUpperCase()}
                                      </div>
                                      {guest.name}
                                    </td>
                                    <td className="py-3 font-mono text-gray-400">{guest.phone}</td>
                                    <td className="py-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getReferrerColor(guest.referrer)}`}>
                                        {guest.referrer || 'Direct Link'}
                                      </span>
                                    </td>
                                    <td className="py-3 text-[11px] text-gray-500 font-mono">
                                      {new Date(guest.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 text-right">
                                      {guest.notified ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                          <CheckCircle2 className="w-3 h-3" /> Yes
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                          <Clock className="w-3 h-3" /> Pending
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

