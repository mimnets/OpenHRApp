import React, { useState } from 'react';
import { Database, Server, Activity, RefreshCw, Save, ArrowRight, ShieldCheck, Globe, AlertCircle } from 'lucide-react';
import { updatePocketBaseConfig } from '../services/pocketbase';
import { hrService } from '../services/hrService';

interface SetupProps {
  onComplete: () => void;
}
// Priority 3: Development Fallback - https://pbase.vclbd.net / https://pocketbase.mimnets.com
const Setup: React.FC<SetupProps> = ({ onComplete }) => {
  const [url, setUrl] = useState('https://pbase.vclbd.net');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Use the helper in hrService to ping the /api/health endpoint
      const result = await hrService.testPocketBaseConnection(url);
      if (result.success) {
        setTestResult({ success: true, message: 'Server is reachable and healthy!' });
      } else {
        setTestResult({ success: false, message: result.error || 'Connection failed. Check IP and Port.' });
      }
    } catch (e) {
      setTestResult({ success: false, message: 'Invalid URL or network timeout.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    updatePocketBaseConfig({ url, source: 'UI' });
    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 bg-indigo-500/10 blur-[120px] rounded-full"></div>
      
      <div className="w-full max-w-xl animate-in fade-in zoom-in duration-500 relative z-10">
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden">
          <div className="bg-[#0f172a] p-10 text-white text-center">
            <div className="inline-flex items-center justify-center p-4 bg-indigo-600 rounded-3xl mb-6 shadow-xl shadow-indigo-900/20">
              <Database size={40} />
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Backend Setup</h1>
            <p className="text-slate-400 font-medium">Link OpenHR to your PocketBase instance</p>
          </div>

          <div className="p-10 space-y-8">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">PocketBase IP Address</label>
              <div className="relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">
                  <Server size={20} />
                </div>
                <input 
                  type="text" 
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                  placeholder="https://pbase.vclbd.net"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-slate-400 px-2 font-medium italic">Note: The system will automatically remove any trailing "/api" if included.</p>
            </div>

            {testResult && (
              <div className={`p-6 rounded-[2rem] flex items-start gap-4 border animate-in slide-in-from-top-4 ${
                testResult.success ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
              }`}>
                {testResult.success ? <ShieldCheck className="mt-0.5" /> : <AlertCircle className="mt-0.5" />}
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest">Test Result</p>
                  <p className="text-sm font-bold">{testResult.message}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handleTest}
                disabled={isTesting}
                className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                {isTesting ? <RefreshCw className="animate-spin" size={18} /> : <Activity size={18} />}
                Test Connection
              </button>
              <button 
                onClick={handleSave}
                disabled={!url || isTesting}
                className="flex-[1.5] py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                Save & Continue <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;