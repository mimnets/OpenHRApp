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

export const contactService = {
  async submitContactForm(data: ContactFormData): Promise<ContactResponse> {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Service not configured. Please try again later.' };
    }

    try {
      const { error } = await supabase.from('contact_submissions').insert({
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
      });
      if (error) throw error;
      return { success: true, message: 'Message sent successfully.' };
    } catch (err: any) {
      console.error('[ContactService] Failed to submit:', err?.message || err);
      return { success: false, message: err?.message || 'Failed to send message. Please try again later.' };
    }
  },
};
