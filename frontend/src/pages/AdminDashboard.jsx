import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Upload, Link as LinkIcon, RefreshCcw, FolderArchive, Trash2 } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

export default function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', mode: 'archive', drive_link: '' });
  const [selectedFile, setSelectedFile] = useState(null);

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

  const handleCreate = async (e) => {
    e.preventDefault();
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
      fetchEvents();
    } catch (err) {
      alert("Failed to delete event");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Studio Operations</h1>
        <button onClick={fetchEvents} className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
          <RefreshCcw className="w-4 h-4" /> Refresh Status
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Create New Event</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Event Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g. Smith Wedding"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Operation Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setForm({...form, mode: 'archive'})}
                    className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-all ${form.mode === 'archive' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground'}`}
                  >
                    <FolderArchive className="w-5 h-5 mb-1" />
                    <span className="text-sm">Archive (ZIP)</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setForm({...form, mode: 'live'})}
                    className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-all ${form.mode === 'live' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground'}`}
                  >
                    <LinkIcon className="w-5 h-5 mb-1" />
                    <span className="text-sm">Live (Drive)</span>
                  </button>
                </div>
              </div>

              {form.mode === 'live' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-sm font-medium mb-1 text-muted-foreground">Google Drive Link</label>
                  <input 
                    type="url" 
                    required
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none"
                    value={form.drive_link}
                    onChange={e => setForm({...form, drive_link: e.target.value})}
                    placeholder="https://drive.google.com/..."
                  />
                </motion.div>
              )}

              {form.mode === 'archive' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-sm font-medium mb-1 text-muted-foreground">Upload Photos (ZIP)</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors relative cursor-pointer group">
                    <input 
                      type="file" 
                      accept=".zip" 
                      required
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={e => setSelectedFile(e.target.files[0])}
                    />
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm text-muted-foreground">{selectedFile ? selectedFile.name : "Click or drag ZIP file here"}</span>
                  </div>
                </motion.div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {loading ? "Initializing..." : "Create Event"}
              </button>
            </form>
          </motion.div>
        </div>

        <div className="md:col-span-2">
          <div className="grid gap-4">
            {events.length === 0 ? (
              <div className="text-center p-12 text-muted-foreground border border-dashed border-border rounded-xl">
                No events created yet.
              </div>
            ) : (
              events.map((evt, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: idx * 0.1 }}
                  key={evt.id} 
                  className="glass-panel p-5 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-bold text-lg">{evt.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="capitalize">{evt.mode} Mode</span>
                      <span>•</span>
                      <span>{evt.photo_count} photos indexed</span>
                      <span>•</span>
                      <span className="text-xs font-mono">{new Date(evt.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      evt.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      evt.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400 animate-pulse' :
                      evt.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {evt.status.toUpperCase()}
                    </span>
                    <button onClick={() => handleDelete(evt.id)} className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-full hover:bg-red-500/10" title="Delete Event">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
