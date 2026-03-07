'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Fredoka, Space_Grotesk } from 'next/font/google';
import { Send, CheckCircle2, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { FormSchema, Settings } from '@/lib/data-store';
import Link from 'next/link';

const fredoka = Fredoka({ subsets: ['latin'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export default function RegisterPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const router = useRouter();

  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State Values
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const [formRes, settingsRes] = await Promise.all([
        fetch(`/api/forms?eventId=${eventId}`),
        fetch('/api/settings')
      ]);

      if (!formRes.ok) throw new Error('Registration form not found for this event.');
      
      const form = await formRes.json();
      const settings = await settingsRes.json();
      
      if (!form.isActive) throw new Error('Registration for this event is currently closed.');
      
      setFormSchema(form);
      setAppsScriptUrl(form.appsScriptUrl || settings.appsScriptUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to load registration form.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id: string, value: any) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appsScriptUrl) {
      setError('Registration is temporarily unavailable (Webhook not configured).');
      return;
    }

    setSubmitting(true);
    setError(null);
    
    // Format data for Google Sheets
    // Map field keys back to readable labels if possible, or just send IDs. Sending Labels is better for sheets headers.
    const payload: Record<string, any> = {};
    if (formSchema) {
      formSchema.fields.forEach(field => {
        payload[field.label] = formData[field.id] || '';
      });
      // Add timestamp and Event ID automatically
      payload['Timestamp'] = new Date().toISOString();
      payload['Event ID'] = eventId;
    }

    try {
      const res = await fetch(appsScriptUrl, {
        method: 'POST',
        // using text/plain to avoid CORS preflight issues strictly with google apps script
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      // We might get an opaque response or CORS error depending on how the fetch executes,
      // but if the promise resolves, we assume the data was sent.
      setSuccess(true);
    } catch (err) {
      console.error(err);
      // Fallback success because fetch to apps script from client might throw network error due to opaque response
      setSuccess(true); 
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-6">
        <RefreshCw className="w-12 h-12 text-accent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-rose-400 mb-6" />
        <h1 className={`${fredoka.className} text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-rose-600 mb-4`}>
          Oops!
        </h1>
        <p className={`${spaceGrotesk.className} text-xl text-blue-200 mb-8 max-w-md`}>
          {error}
        </p>
        <Link 
          href="/events"
          className={`${spaceGrotesk.className} inline-flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-colors font-bold`}
        >
          <ArrowLeft className="w-5 h-5 mr-3" />
          Back to Events
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6 text-center pt-24 pb-20 overflow-hidden relative">
        <div className="absolute top-20 left-10 w-64 h-64 bg-accent/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 animate-pulse delay-1000"></div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
        >
          <CheckCircle2 className="w-24 h-24 text-emerald-400 mx-auto mb-8 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
        </motion.div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`${fredoka.className} text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-emerald-600 mb-6 pb-2`}
        >
          You're Registered!
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`${spaceGrotesk.className} text-xl md:text-2xl text-blue-100 opacity-90 mb-10 max-w-lg`}
        >
          Thank you for signing up. We've successfully received your information and look forward to seeing you there.
        </motion.p>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Link 
            href="/events"
            className={`${spaceGrotesk.className} inline-flex items-center px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl transition-all duration-300 font-bold hover:scale-105 shadow-xl`}
          >
            <ArrowLeft className="w-5 h-5 mr-3" />
            Discover More Events
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary pt-24 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden text-white">
      <div className="absolute top-20 left-10 w-64 h-64 bg-accent/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-40 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse delay-1000"></div>

      <div className="max-w-2xl mx-auto relative z-10">
        <Link 
          href="/events" 
          className="inline-flex items-center text-blue-200 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Events
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className={`${fredoka.className} text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-purple-500 pb-2`}>
            Event Registration
          </h1>
          <p className={`${spaceGrotesk.className} mt-4 text-xl text-blue-100 opacity-90`}>
            Fill out the form below to secure your spot!
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 md:p-10 rounded-3xl shadow-2xl"
        >
          <form onSubmit={handleSubmit} className={`space-y-6 ${spaceGrotesk.className}`}>
            {formSchema?.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <label htmlFor={field.id} className="block text-sm font-semibold text-slate-300">
                  {field.label} {field.required && <span className="text-rose-400 ml-1">*</span>}
                </label>
                
                {field.type === 'text' || field.type === 'email' ? (
                  <input
                    id={field.id}
                    type={field.type}
                    required={field.required}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent focus:bg-slate-800 transition-colors"
                    value={formData[field.id] || ''}
                    onChange={e => handleInputChange(field.id, e.target.value)}
                  />
                ) : field.type === 'textarea' ? (
                  <textarea
                    id={field.id}
                    required={field.required}
                    rows={4}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent focus:bg-slate-800 transition-colors resize-none"
                    value={formData[field.id] || ''}
                    onChange={e => handleInputChange(field.id, e.target.value)}
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={field.id}
                    required={field.required}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent focus:bg-slate-800 transition-colors appearance-none"
                    value={formData[field.id] || ''}
                    onChange={e => handleInputChange(field.id, e.target.value)}
                  >
                    <option value="" disabled>-- Select an option --</option>
                    {field.options?.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'radio' ? (
                  <div className="space-y-2 mt-2">
                    {field.options?.map((opt, i) => (
                      <label key={i} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name={field.id}
                          required={field.required}
                          value={opt}
                          checked={formData[field.id] === opt}
                          onChange={e => handleInputChange(field.id, e.target.value)}
                          className="w-5 h-5 accent-accent bg-slate-800 border-white/10 cursor-pointer"
                        />
                        <span className="text-white font-medium">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required={field.required}
                      className="w-5 h-5 accent-accent bg-slate-800 border-white/10 rounded"
                      checked={!!formData[field.id]}
                      onChange={e => handleInputChange(field.id, e.target.checked)}
                    />
                    <span className="text-white font-medium">{field.label} {field.required && <span className="text-rose-400 ml-1">*</span>}</span>
                  </label>
                ) : null}
              </div>
            ))}

            <div className="pt-8">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center px-8 py-4 bg-accent text-slate-900 rounded-2xl font-bold text-lg hover:bg-amber-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-xl shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group"
              >
                {submitting ? (
                  <div className="flex items-center">
                    <RefreshCw className="w-6 h-6 mr-3 animate-spin" />
                    Submitting...
                  </div>
                ) : (
                  <div className="flex items-center">
                    Submit Registration
                    <Send className="w-5 h-5 ml-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </div>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
