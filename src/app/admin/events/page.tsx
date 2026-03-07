'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fredoka, Space_Grotesk } from 'next/font/google';
import { Plus, Edit2, Trash2, Calendar, MapPin, Clock, X } from 'lucide-react';
import { Event } from '@/data/events';

const fredoka = Fredoka({ subsets: ['latin'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '', date: '', time: '', location: '', description: '', status: 'upcoming'
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setFormData(event);
    } else {
      setEditingEvent(null);
      setFormData({ title: '', date: '', time: '', location: '', description: '', status: 'upcoming' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = !!editingEvent;
    
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const body = { ...formData };
      if (isEditing) body.id = editingEvent.id;

      const res = await fetch('/api/events', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        fetchEvents();
        handleCloseModal();
      }
    } catch (err) {
      console.error('Failed to save event', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchEvents();
    } catch (err) {
      console.error('Failed to delete event', err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`${fredoka.className} text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-purple-500`}>
            Manage Events
          </h1>
          <p className={`${spaceGrotesk.className} text-blue-200 mt-2`}>
            Create, update, or remove events displayed on the website.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className={`${spaceGrotesk.className} inline-flex items-center px-6 py-3 bg-accent text-slate-900 rounded-xl font-bold hover:bg-amber-400 transition-colors shadow-lg shadow-accent/20`}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Event
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {events.map((event) => (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 flex flex-col relative group hover:border-accent/50 transition-colors"
              >
                {/* Status Badge */}
                <div className={`absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full uppercase ${
                  event.status === 'upcoming' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'
                }`}>
                  {event.status}
                </div>

                <h3 className={`${fredoka.className} text-2xl font-bold text-white pr-20 mb-4 line-clamp-2`}>
                  {event.title}
                </h3>
                
                <div className={`space-y-3 mb-6 flex-grow ${spaceGrotesk.className} text-sm text-blue-200`}>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-3 opacity-70" />
                    {event.date}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-3 opacity-70" />
                    {event.time}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-3 opacity-70" />
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-auto pt-4 border-t border-white/10">
                  <button
                    onClick={() => handleOpenModal(event)}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center font-semibold text-sm"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-200 rounded-lg transition-colors flex items-center justify-center border border-red-900/50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {events.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-400 bg-slate-800/30 rounded-3xl border border-dashed border-white/10">
              No events found. Create one to get started!
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={handleCloseModal}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h2 className={`${fredoka.className} text-3xl font-bold text-white mb-6`}>
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h2>

              <form onSubmit={handleSubmit} className={`space-y-6 ${spaceGrotesk.className}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-300">Event Title</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">Date Display String</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. March 25, 2026"
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">Time Display String</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. 2:45 PM - 3:45 PM"
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent"
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-300">Location</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-300">Status</label>
                    <select
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent"
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as 'upcoming' | 'past' })}
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="past">Past</option>
                    </select>
                  </div>

                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-300">Description</label>
                    <textarea
                      required
                      rows={4}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <label className="text-sm font-semibold text-slate-300">Image URL (Optional)</label>
                    <input
                      type="text"
                      placeholder="/EggDropBG.png"
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent"
                      value={formData.image || ''}
                      onChange={e => setFormData({ ...formData, image: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-6 flex justify-end gap-4 border-t border-white/10 mt-8">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-3 rounded-xl font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-accent text-slate-900 rounded-xl font-bold hover:bg-amber-400 transition-colors shadow-lg shadow-accent/20"
                  >
                    {editingEvent ? 'Save Changes' : 'Create Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
