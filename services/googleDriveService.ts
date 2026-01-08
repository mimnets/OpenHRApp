
/**
 * Google Drive Integration Service
 * Handles OAuth2 and File Uploads to Google Drive
 */

const CLIENT_ID = '879929245496-dcdfsdfsdfsf5pdfgbvt38ueotp4u52eh52pbffn8o.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly';
const SYNC_FILENAME = 'OpenHR_Cloud_Sync.json';

let accessToken: string | null = null;

export const googleDriveService = {
  async connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (!(window as any).google?.accounts?.oauth2) {
          reject(new Error("Google Identity Services not loaded."));
          return;
        }
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (response: any) => {
            if (response.error) {
              reject(response);
            }
            accessToken = response.access_token;
            localStorage.setItem('google_drive_token', accessToken!);
            resolve(accessToken!);
          },
        });
        client.requestAccessToken();
      } catch (err) {
        reject(err);
      }
    });
  },

  disconnect() {
    accessToken = null;
    localStorage.removeItem('google_drive_token');
    localStorage.removeItem('google_drive_folder_id');
    localStorage.removeItem('google_drive_folder_name');
  },

  isConnected() {
    return !!localStorage.getItem('google_drive_token');
  },

  getAccessToken() {
    return accessToken || localStorage.getItem('google_drive_token');
  },

  setSelectedFolder(id: string, name: string) {
    localStorage.setItem('google_drive_folder_id', id);
    localStorage.setItem('google_drive_folder_name', name);
  },

  getSelectedFolder() {
    return {
      id: localStorage.getItem('google_drive_folder_id') || 'root',
      name: localStorage.getItem('google_drive_folder_name') || 'Root Drive',
    };
  },

  async handleResponse(response: Response) {
    if (response.status === 401) {
      console.warn("Google Drive: Unauthorized access. Clearing token.");
      this.disconnect();
      throw new Error("Authentication expired. Please reconnect Google Drive.");
    }
    return response;
  },

  async listFolders() {
    const token = this.getAccessToken();
    if (!token) return [];

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id, name)&pageSize=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    await this.handleResponse(response);
    if (!response.ok) return [];
    const data = await response.json();
    return data.files as { id: string; name: string }[];
  },

  async uploadFile(content: string, filename: string, folderId: string = 'root') {
    const token = this.getAccessToken();
    if (!token) throw new Error('Not connected to Google');

    const metadata = { name: filename, mimeType: 'application/json', parents: [folderId] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'application/json' }));

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    await this.handleResponse(response);
    if (!response.ok) throw new Error('Failed to upload');
    return await response.json();
  },

  async updateFileContent(fileId: string, content: string) {
    const token = this.getAccessToken();
    if (!token) throw new Error('Not connected to Google');

    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: content,
    });

    await this.handleResponse(response);
    return await response.json();
  },

  async syncToSingleFile(content: string) {
    const folder = this.getSelectedFolder();
    const token = this.getAccessToken();
    if (!token) throw new Error('No access token');

    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${SYNC_FILENAME}' and '${folder.id}' in parents and trashed=false&fields=files(id, name)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    await this.handleResponse(searchResponse);
    const searchData = await searchResponse.json();
    const existingSyncFile = searchData.files?.[0];

    if (existingSyncFile) {
      return await this.updateFileContent(existingSyncFile.id, content);
    } else {
      return await this.uploadFile(content, SYNC_FILENAME, folder.id);
    }
  },

  async listBackups() {
    const token = this.getAccessToken();
    if (!token) return [];
    const folder = this.getSelectedFolder();
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=mimeType='application/json' and '${folder.id}' in parents and trashed=false&fields=files(id, name, createdTime)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    await this.handleResponse(response);
    const data = await response.json();
    return data.files || [];
  },

  async downloadFile(fileId: string): Promise<string> {
    const token = this.getAccessToken();
    if (!token) throw new Error('Not connected');
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await this.handleResponse(response);
    return await response.text();
  }
};
