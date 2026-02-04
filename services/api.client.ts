
import { pb, isPocketBaseConfigured } from './pocketbase';

const subscribers: Set<() => void> = new Set();

export const apiClient = {
  pb,
  isConfigured: isPocketBaseConfigured,

  // Event Bus for global state updates
  subscribe(callback: () => void) {
    subscribers.add(callback);
    return () => { subscribers.delete(callback); };
  },

  notify() {
    subscribers.forEach(cb => cb());
  },

  // Helper to get current Organization ID
  getOrganizationId(): string | undefined {
    return pb?.authStore.model?.organization_id;
  },

  // Helpers
  dataURLtoBlob(dataurl: string) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) { u8arr[n] = bstr.charCodeAt(n); }
    return new Blob([u8arr], { type: mime });
  },

  toFormData(data: any, fileName: string = 'file.jpg') {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (typeof value === 'string' && value.startsWith('data:')) {
        formData.append(key, this.dataURLtoBlob(value), fileName);
      } else if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });
    return formData;
  }
};
