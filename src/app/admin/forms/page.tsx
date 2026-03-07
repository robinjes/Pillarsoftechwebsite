'use client'

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fredoka, Space_Grotesk } from 'next/font/google';
import { Plus, Trash2, Save, ArrowRight, Settings } from 'lucide-react';
import { Event } from '@/data/events';
import { FormSchema, FormField } from '@/lib/data-store';

const fredoka = Fredoka({ subsets: ['latin'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export default function AdminForms() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [currentForm, setCurrentForm] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchFormForEvent(selectedEventId);
    } else {
      setCurrentForm(null);
    }
  }, [selectedEventId]);

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

  const fetchFormForEvent = async (eventId: string) => {
    try {
      const res = await fetch(`/api/forms?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentForm(data);
      } else {
        // Form doesn't exist yet, setup a default
        setCurrentForm({
          id: '',
          eventId: eventId,
          isActive: true,
          appsScriptUrl: '',
          fields: [
            { id: 'name', type: 'text', label: 'Full Name', required: true },
            { id: 'email', type: 'email', label: 'Email Address', required: true }
          ]
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddField = () => {
    if (!currentForm) return;
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      required: false
    };
    setCurrentForm({
      ...currentForm,
      fields: [...currentForm.fields, newField]
    });
  };

  const handleRemoveField = (id: string) => {
    if (!currentForm) return;
    setCurrentForm({
      ...currentForm,
      fields: currentForm.fields.filter(f => f.id !== id)
    });
  };

  const handleUpdateField = (id: string, updates: Partial<FormField>) => {
    if (!currentForm) return;
    setCurrentForm({
      ...currentForm,
      fields: currentForm.fields.map(f => f.id === id ? { ...f, ...updates } : f)
    });
  };

  const handleSaveForm = async () => {
    if (!currentForm) return;
    setSaving(true);
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentForm)
      });
      if (res.ok) {
        alert('Form saved successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save form.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className={`${fredoka.className} text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-purple-500`}>
          Form Builder
        </h1>
        <p className={`${spaceGrotesk.className} text-blue-200 mt-2`}>
          Create custom registration forms for your events and link them to Google Sheets.
        </p>
      </div>

      <div className="bg-slate-800/50 border border-white/10 p-6 rounded-2xl w-full max-w-2xl">
        <label className={`block text-sm font-semibold text-slate-300 mb-2 ${spaceGrotesk.className}`}>
          Select Event
        </label>
        <select
          className={`w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent ${spaceGrotesk.className}`}
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
        >
          <option value="">-- Choose an Event --</option>
          {events.map(event => (
            <option key={event.id} value={event.id}>{event.title}</option>
          ))}
        </select>
      </div>

      {currentForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-white/10 p-6 md:p-8 rounded-3xl"
        >
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-between items-center">
              <h2 className={`${fredoka.className} text-2xl font-bold text-white`}>
                Customize Form
              </h2>
              <div className="flex items-center space-x-2">
                <label className={`text-sm text-slate-300 font-semibold ${spaceGrotesk.className}`}>Active</label>
                <input 
                  type="checkbox" 
                  checked={currentForm.isActive}
                  onChange={(e) => setCurrentForm({...currentForm, isActive: e.target.checked})}
                  className="w-5 h-5 accent-accent"
                />
              </div>
            </div>
            
            <div className="flex flex-col space-y-2 mb-4 bg-slate-800/50 p-4 rounded-xl border border-white/5">
              <label className={`text-sm font-semibold text-slate-300 ${spaceGrotesk.className}`}>Google Apps Script Webhook URL (Required)</label>
              <input 
                type="text" 
                value={currentForm.appsScriptUrl || ''}
                onChange={(e) => setCurrentForm({...currentForm, appsScriptUrl: e.target.value})}
                placeholder="https://script.google.com/macros/s/.../exec"
                className={`w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent ${spaceGrotesk.className}`}
              />
              <p className="text-xs text-blue-200 opacity-80 mt-1">This form will send its submissions directly to this custom Webhook.</p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <AnimatePresence>
              {currentForm.fields.map((field, index) => (
                <motion.div
                  key={field.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-slate-800/80 border border-white/5 p-4 rounded-xl flex flex-col gap-4"
                >
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center w-full">
                    <div className="flex-1 space-y-2 w-full">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                      className={`w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white font-semibold ${spaceGrotesk.className}`}
                      placeholder="Field Label"
                    />
                  </div>
                  
                  <div className="flex-1 space-y-2 w-full">
                    <select
                      value={field.type}
                      onChange={(e) => handleUpdateField(field.id, { type: e.target.value as any })}
                      className={`w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white ${spaceGrotesk.className}`}
                    >
                      <option value="text">Short Text</option>
                      <option value="email">Email</option>
                      <option value="textarea">Long Text</option>
                      <option value="select">Dropdown</option>
                      <option value="radio">Multiple Choice</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto mt-2 md:mt-0 justify-between md:justify-end">
                    <label className={`flex items-center text-sm text-slate-300 ${spaceGrotesk.className}`}>
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                        className="mr-2 accent-accent"
                      />
                      Required
                    </label>
                    <button
                      onClick={() => handleRemoveField(field.id)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Remove Field"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  </div>

                  {/* For Select and Radio types, input comma separated options */}
                  {(field.type === 'select' || field.type === 'radio') && (
                    <div className="w-full">
                       <input
                        type="text"
                        value={field.options?.join(', ') || ''}
                        onChange={(e) => handleUpdateField(field.id, { options: e.target.value.split(',').map(s => s.trimStart()) })}
                        className={`w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white ${spaceGrotesk.className}`}
                        placeholder="Options (comma separated)"
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-white/10 pt-6">
            <button
              onClick={handleAddField}
              className={`flex items-center px-4 py-2 border border-accent text-accent rounded-xl hover:bg-accent/10 transition-colors ${spaceGrotesk.className} font-semibold`}
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Field
            </button>
            <button
              onClick={handleSaveForm}
              disabled={saving}
              className={`flex items-center px-6 py-3 bg-accent text-slate-900 rounded-xl font-bold hover:bg-amber-400 transition-colors shadow-lg shadow-accent/20 ${spaceGrotesk.className} disabled:opacity-50`}
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Saving...' : 'Save Form'}
            </button>
          </div>
        </motion.div>
      )}

      {!currentForm && selectedEventId === '' && (
        <div className="text-center py-20 text-slate-400 bg-slate-800/30 rounded-3xl border border-dashed border-white/10">
          <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className={`${spaceGrotesk.className} text-lg`}>Select an event above to start building its registration form.</p>
        </div>
      )}
    </div>
  );
}
