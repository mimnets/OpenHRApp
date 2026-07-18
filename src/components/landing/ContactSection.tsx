import React, { useState, useRef } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { contactService } from '../../services/contact.service';

// ── Constants ──────────────────────────────────────────────────────────────────
const LOAD_TIME_MS = 2000; // form must have been visible for at least 2s (bot check)

const ContactSection: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [honeypot, setHoneypot] = useState(''); // hidden field — bots fill, humans don't
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const mountTime = useRef(Date.now());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    // ── Client-side spam checks ────────────────────────────────────────────
    // 1. Honeypot: if filled, silently "succeed" without sending (it's a bot)
    if (honeypot.trim().length > 0) {
      setResult({ type: 'success', message: 'Message sent successfully.' });
      setForm({ name: '', email: '', subject: '', message: '' });
      setHoneypot('');
      return;
    }

    // 2. Timing check: if form submitted too fast, likely a bot
    if (Date.now() - mountTime.current < LOAD_TIME_MS) {
      setResult({ type: 'error', message: 'Please wait a moment before submitting.' });
      return;
    }

    // 3. Required fields
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setResult({ type: 'error', message: 'Please fill in all required fields.' });
      return;
    }

    // 4. Basic email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setResult({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    // 5. Link/URL detection in message (phishing check)
    const urlPattern = /https?:\/\//i;
    if (urlPattern.test(form.message)) {
      setResult({ type: 'error', message: 'Please remove links from your message. If you need to reference a URL, describe it in words.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await contactService.submitContactForm(form);
      if (response.success) {
        setResult({ type: 'success', message: response.message });
        setForm({ name: '', email: '', subject: '', message: '' });
      } else {
        setResult({ type: 'error', message: response.message });
      }
    } catch {
      setResult({ type: 'error', message: 'Something went wrong. Please try again later.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 md:py-28 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-primary uppercase tracking-wide">Contact</span>
          <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 mt-3 mb-4">
            Get in Touch
          </h2>
          <p className="text-slate-500 text-lg">
            Have a question or feedback? We'd love to hear from you.
          </p>
        </div>

        {/* Form */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Honeypot — hidden from humans, visible to bots ──────────────── */}
            <div className="absolute opacity-0 pointer-events-none" style={{ height: 0, overflow: 'hidden' }} aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                type="text"
                id="website"
                name="website"
                autoComplete="off"
                tabIndex={-1}
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="Your name"
                  className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  maxLength={254}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">
                Subject
              </label>
              <input
                type="text"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                maxLength={200}
                placeholder="What is this about?"
                className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">
                Message <span className="text-red-400">*</span>
              </label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                maxLength={5000}
                placeholder="Tell us what's on your mind..."
                rows={5}
                className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none"
              />
            </div>

            {result && (
              <div className={`flex items-start gap-3 p-4 rounded-xl text-sm font-medium ${
                result.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {result.type === 'success' ? <CheckCircle size={18} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />}
                <span>{result.message}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-hover transition-all shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
