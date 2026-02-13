import { pb } from './pocketbase';

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
    if (!pb) {
      return { success: false, message: 'Service not configured. Please try again later.' };
    }

    try {
      const response = await pb.send('/api/openhr/contact', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });

      return {
        success: response.success ?? false,
        message: response.message ?? 'Message sent successfully.',
      };
    } catch (err: any) {
      const message =
        err?.response?.message ||
        err?.message ||
        'Failed to send message. Please try again later.';
      return { success: false, message };
    }
  },
};
