import { supabase, isSupabaseConfigured } from './supabase';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface ContactResponse {
  success: boolean;
  message: string;
}

const MAX_LENGTHS: Record<keyof ContactFormData, number> = {
  name: 100,
  email: 254,
  subject: 200,
  message: 5000,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Basic server-side sanitization: strip HTML tags, trim whitespace */
function sanitize(val: string): string {
  return val.replace(/<[^>]*>/g, '').trim();
}

/** Validate and sanitize the full form payload. Returns null if valid, error string if not. */
function validate(data: ContactFormData): string | null {
  // Required fields
  if (!data.name.trim()) return 'Name is required.';
  if (!data.email.trim()) return 'Email is required.';
  if (!data.message.trim()) return 'Message is required.';

  // Email format
  if (!EMAIL_RE.test(data.email.trim())) return 'Please enter a valid email address.';

  // Max lengths
  for (const [field, max] of Object.entries(MAX_LENGTHS)) {
    if (data[field as keyof ContactFormData].length > max) {
      return `${field} must be under ${max} characters.`;
    }
  }

  return null; // valid
}

export const contactService = {
  async submitContactForm(data: ContactFormData): Promise<ContactResponse> {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Service not configured. Please try again later.' };
    }

    // Validate & sanitize before sending
    const validationError = validate(data);
    if (validationError) {
      return { success: false, message: validationError };
    }

    try {
      const { error } = await supabase.from('contact_submissions').insert({
        name: sanitize(data.name),
        email: sanitize(data.email).toLowerCase(),
        subject: sanitize(data.subject) || 'General Inquiry',
        message: sanitize(data.message),
        honeypot: '', // always empty; bots are caught client-side
      });
      if (error) throw error;
      return { success: true, message: 'Message sent successfully.' };
    } catch (err: any) {
      console.error('[ContactService] Failed to submit:', err?.message || err);
      return { success: false, message: err?.message || 'Failed to send message. Please try again later.' };
    }
  },
};
