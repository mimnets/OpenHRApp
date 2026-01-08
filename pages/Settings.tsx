
import React, { useState, useEffect } from 'react';
import { 
  Save,
  Mail,
  RefreshCw,
  Server,
  Clock,
  Inbox,
  Globe,
  Zap,
  Activity,
  ShieldCheck,
  Cloud,
  CloudOff,
  FolderOpen,
  Download,
  Trash2,
  Edit2,
  Send,
  CheckCircle,
  XCircle,
  Database,
  Search,
  ChevronRight,
  // Added missing Info icon import
  Info
} from 'lucide-react';
import { hrService } from '../services/hrService';
import { emailService } from '../services/emailService';
import { googleDriveService } from '../services/googleDriveService';
import { RelayConfig, SentEmail } from '../types';

type SettingsTab = 'COMMUNICATION' | 'BACKUP';

const Settings: React.FC = () => {
  const currentUser = hrService.getCurrentUser();
  const isAdmin = ['ADMIN', 'HR'].includes(currentUser?.role || '');
  const [activeTab, setActiveTab] = useState<SettingsTab>('COMMUNICATION');
  
  // Communication State
  const [relayConfig, setRelayConfig] = useState<RelayConfig>(hrService.getConfig().smtp || {
    username: 'admin@openhr.com',
    fromName: 'OpenHR System',
    isActive: true,
    relayUrl: 'http://localhost:5000'
  });
  const [outbox, setOutbox] = useState<SentEmail[]>([]);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [editingMailId, setEditingMailId] = useState<string | null>(null);
  const [tempEmail, setTempEmail] = useState('');

  // Backup State
  const [isCloudConnected, setIsCloudConnected] = useState(googleDriveService.isConnected());
  const [driveFolders, setDriveFolders] = useState<{id: string, name: string}[]>([]);
  const [selectedFolder, setSelectedFolder] = useState(googleDriveService.getSelectedFolder());
  const [backups, setBackups] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    refreshOutbox();
    if (isCloudConnected) {
      loadDriveData();
    }
  }, [isCloudConnected]);

  const refreshOutbox = () => {
    setOutbox(emailService.getOutbox());
  };

  const loadDriveData = async () => {
    try {
      const folders = await googleDriveService.listFolders();
      setDriveFolders(folders);
      const remoteBackups = await googleDriveService.listBackups();
      setBackups(remoteBackups);
    } catch (err) {
      console.error('Failed to load drive data', err);
    }
  };

  const handleConnectCloud = async () => {
    try {
      await googleDriveService.connect();
      setIsCloudConnected(true);
    } catch (err) {
      alert("Failed to connect to Google Drive. Ensure you have allowed popup permissions.");
    }
  };

  const handleDisconnectCloud = () => {
    googleDriveService.disconnect();
    setIsCloudConnected(false);
    setBackups([]);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const data = hrService.exportFullData();
      await googleDriveService.syncToSingleFile(data);
      await loadDriveData();
      alert('Cloud synchronization successful.');
    } catch (err) {
      alert('Sync failed. Check cloud connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreBackup = async (fileId: string) => {
    if (!confirm('This will overwrite all local HR data with the backup version. Continue?')) return;
    try {
      const content = await googleDriveService.downloadFile(fileId);
      const parsedData = JSON.parse(content);
      // Restore logic: loop through keys and set to localStorage
      Object.keys(parsedData).forEach(key => {
        if (parsedData[key]) localStorage.setItem(key, parsedData[key]);
      });
      window.location.reload(); // Hard reload to re-init app with new data
    } catch (err) {
      alert('Failed to restore backup.');
    }
  };

  const handleSaveRelay = (e: React.FormEvent) => {
    e.preventDefault();
    const currentConfig = hrService.getConfig();
    const sanitizedUrl = emailService.sanitizeUrl(relayConfig.relayUrl);
    const finalRelayConfig = { ...relayConfig, relayUrl: sanitizedUrl };
    hrService.setConfig({ ...currentConfig, smtp: finalRelayConfig });
    setRelayConfig(finalRelayConfig);
    alert('Relay API configuration updated.');
  };

  const handleTestBackend = async () => {
    setTestStatus('testing');
    setLastError(null);
    const result = await emailService.testConnection(relayConfig.relayUrl);
    if (result.success) {
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 5000);
    } else {
      setTestStatus('failed');
      setLastError(result.error as string);
    }
  };

  const currentBaseUrl = emailService.sanitizeUrl(relayConfig.relayUrl);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-sm text-slate-500 font-medium tracking-tight">Manage your infrastructure, API bridges, and cloud backups</p>
      </header>

      {/* Settings Navigation */}
      <div className="flex p-1.5 bg-white border border-slate-100 rounded-[2rem] shadow-sm w-fit">
        <button 
          onClick={() => setActiveTab('COMMUNICATION')}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'COMMUNICATION' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Zap size={14} /> Communication Bridge
        </button>
        <button 
          onClick={() => setActiveTab('BACKUP')}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'BACKUP' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Cloud size={14} /> Cloud Backup
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          
          {activeTab === 'COMMUNICATION' ? (
            <>
              {/* Relay Connectivity Dashboard */}
              <div className={`bg-[#0f172a] rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group transition-all duration-500 ${testStatus === 'failed' ? 'ring-2 ring-rose-500/50' : ''}`}>
                <div className="absolute top-0 right-0 p-8 opacity-10"><Zap size={120} /></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-3xl transition-all duration-500 ${testStatus === 'success' ? 'bg-emerald-500' : testStatus === 'failed' ? 'bg-rose-600' : 'bg-indigo-600'}`}>
                       {testStatus === 'testing' ? <RefreshCw className="animate-spin" size={24} /> : <Activity size={24} />}
                    </div>
                    <div>
                       <h3 className="text-xl font-black tracking-tight uppercase">Relay API Status</h3>
                       <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Target: <span className="text-indigo-400 font-mono">{currentBaseUrl}</span></p>
                    </div>
                  </div>
                  <button 
                    onClick={handleTestBackend}
                    disabled={testStatus === 'testing'}
                    className="px-10 py-5 bg-white text-slate-900 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-slate-100 transition-all active:scale-95 flex items-center gap-3"
                  >
                    {testStatus === 'testing' ? 'PINGING...' : 'TEST CONNECTION'}
                  </button>
                </div>
                {lastError && (
                  <div className="mt-8 p-6 bg-rose-500/10 border border-rose-500/30 rounded-3xl animate-in slide-in-from-top-4 duration-500">
                    <p className="text-[10px] font-black uppercase text-rose-300 mb-1">Last Error Log</p>
                    <p className="text-xs font-medium text-white/90 italic">"{lastError}"</p>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 md:p-10">
                  <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Server size={24} /></div>
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight">Relay Endpoint</h3>
                    </div>
                  </div>

                  <form onSubmit={handleSaveRelay} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Relay Base URL</label>
                      <div className="relative">
                        <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                          type="url" 
                          placeholder="http://localhost:5000" 
                          className="w-full pl-14 pr-8 py-5 bg-[#f1f5f9] border border-slate-200 rounded-[2rem] font-black text-indigo-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all" 
                          value={relayConfig.relayUrl} 
                          onChange={e => setRelayConfig({...relayConfig, relayUrl: e.target.value})} 
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-5 bg-[#0f172a] text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-black transition-all">
                      <Save size={18} className="inline mr-2" /> Sync Configuration
                    </button>
                  </form>
                </div>
              )}

              {isAdmin && (
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 md:p-10">
                   <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-slate-800 flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl"><Inbox size={24} /></div>
                        Relay Audit Trail
                      </h3>
                      <button onClick={() => { emailService.clearOutbox(); setOutbox([]); }} className="text-[11px] font-black text-rose-500 uppercase tracking-widest hover:underline transition-all">PURGE ALL</button>
                   </div>
                   
                   <div className="space-y-4">
                      {outbox.map(mail => (
                        <div key={mail.id} className="p-8 bg-[#f8fafc] border border-slate-100 rounded-[2.5rem] hover:bg-white hover:shadow-2xl transition-all group border-l-4 border-l-transparent hover:border-l-indigo-500">
                           <div className="flex justify-between items-start mb-6">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RECIPIENT:</p>
                                  <span className="text-xs font-black text-indigo-600 font-mono">{mail.to}</span>
                                </div>
                                <h4 className="text-xl font-black text-slate-900 truncate">{mail.subject}</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                 <span className={`px-5 py-2 text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm ${mail.status === 'SENT' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'}`}>
                                   {mail.status}
                                 </span>
                              </div>
                           </div>
                           <p className="text-sm text-slate-600 font-medium italic border-l-2 border-slate-200 pl-4">"{mail.body}"</p>
                           <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                             <div className="flex items-center gap-2"><Clock size={12} /> {new Date(mail.sentAt).toLocaleString()}</div>
                             <div className="flex items-center gap-2"><Server size={12} /> Provider: {mail.provider}</div>
                           </div>
                        </div>
                      ))}
                      {outbox.length === 0 && (
                        <div className="py-24 text-center text-slate-300">
                          <Mail size={56} className="mx-auto mb-4 opacity-10" />
                          <p className="text-xs font-black uppercase tracking-widest">No logs found</p>
                        </div>
                      )}
                   </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Cloud Connection Card */}
              <div className={`rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden transition-all duration-500 ${isCloudConnected ? 'bg-indigo-600' : 'bg-slate-900'}`}>
                <div className="absolute top-0 right-0 p-10 opacity-10"><Cloud size={140} /></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className={`p-5 rounded-3xl bg-white/20 shadow-xl`}>
                       {isCloudConnected ? <Cloud size={32} /> : <CloudOff size={32} />}
                    </div>
                    <div>
                       <h3 className="text-2xl font-black tracking-tight uppercase">Google Drive Sync</h3>
                       <p className="text-white/60 text-xs font-medium mt-1">
                         {isCloudConnected 
                           ? "Cloud storage is active and linked to your project." 
                           : "Connect your organization's Google Drive for automated backups."}
                       </p>
                    </div>
                  </div>
                  <button 
                    onClick={isCloudConnected ? handleDisconnectCloud : handleConnectCloud}
                    className="px-12 py-5 bg-white text-slate-900 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-slate-100 transition-all active:scale-95"
                  >
                    {isCloudConnected ? 'DISCONNECT DRIVE' : 'CONNECT TO GOOGLE'}
                  </button>
                </div>
              </div>

              {isCloudConnected && (
                <>
                  {/* Folder & Manual Sync */}
                  <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 md:p-10 space-y-10">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="space-y-2 flex-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                          <FolderOpen size={14} /> Target Drive Folder
                        </label>
                        <select 
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50"
                          value={selectedFolder.id}
                          onChange={(e) => {
                            const folder = driveFolders.find(f => f.id === e.target.value) || {id: 'root', name: 'Root Drive'};
                            googleDriveService.setSelectedFolder(folder.id, folder.name);
                            setSelectedFolder(folder);
                          }}
                        >
                          <option value="root">My Drive (Root)</option>
                          {driveFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button 
                          onClick={handleManualSync}
                          disabled={isSyncing}
                          className="w-full md:w-auto px-10 py-4 bg-[#0f172a] text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                          {isSyncing ? <RefreshCw className="animate-spin" size={16} /> : <Database size={16} />}
                          Initialize Manual Sync
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Backup History */}
                  <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 md:p-10">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-4 mb-8">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Clock size={24} /></div>
                      Backup History & Restoration
                    </h3>
                    
                    <div className="space-y-4">
                      {backups.map(backup => (
                        <div key={backup.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-white hover:shadow-xl transition-all">
                           <div className="flex items-center gap-4">
                              <div className="p-3 bg-white border border-slate-100 rounded-xl text-indigo-500 shadow-sm"><Database size={20} /></div>
                              <div>
                                <p className="text-sm font-black text-slate-900">{backup.name}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Created: {new Date(backup.createdTime).toLocaleString()}</p>
                              </div>
                           </div>
                           <button 
                             onClick={() => handleRestoreBackup(backup.id)}
                             className="px-6 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                           >
                             <Download size={14} /> Restore
                           </button>
                        </div>
                      ))}
                      {backups.length === 0 && (
                        <div className="py-20 text-center text-slate-300">
                          <Database size={48} className="mx-auto mb-4 opacity-10" />
                          <p className="text-[10px] font-black uppercase tracking-widest">No cloud backups found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="space-y-8">
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck size={80} /></div>
              <h3 className="text-xl font-black uppercase flex items-center gap-2">
                <ShieldCheck className="text-emerald-400" /> System Integrity
              </h3>
              <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">
                All changes made to settings are strictly audited and synced with the backend relay for full operational accountability.
              </p>
           </div>
           
           <div className="p-8 bg-indigo-50 rounded-[2.5rem] border border-indigo-100">
              <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Info size={16} /> Maintenance Tips
              </h4>
              <ul className="space-y-3">
                {[
                  "Test Relay connection after every URL change.",
                  "Daily Cloud Sync ensures 0% data loss.",
                  "Audit logs are kept for the last 50 transactions."
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-[10px] font-medium text-indigo-700">
                    <ChevronRight size={12} className="mt-0.5 shrink-0" /> {tip}
                  </li>
                ))}
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
