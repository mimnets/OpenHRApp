
import React, { useState } from 'react';
import { Building2, User, Mail, Lock, ArrowRight, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { hrService } from '../services/hrService';

interface Props {
  onBack: () => void;
  onSuccess: (user: any) => void;
}

const RegisterOrganization: React.FC<Props> = ({ onBack, onSuccess }) => {
  const [formData, setFormData] = useState({
    orgName: '',
    adminName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await hrService.registerOrganization({
      orgName: formData.orgName,
      adminName: formData.adminName,
      email: formData.email,
      password: formData.password
    });

    if (result.success) {
      // Auto-login happens in service, just trigger success flow
      const loginResult = await hrService.login(formData.email, formData.password);
      if (loginResult.user) {
        onSuccess(loginResult.user);
      } else {
        setError("Registration successful, but auto-login failed. Please sign in manually.");
        setIsSubmitting(false);
      }
    } else {
      setError(result.error || "Registration failed.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#f8fafc] relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[100px] rounded-full -z-10"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[100px] rounded-full -z-10"></div>

      <div className="w-full max-w-lg bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8">
        <div className="bg-slate-900 p-8 text-white relative">
          <button onClick={onBack} className="absolute left-8 top-8 p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"><ArrowLeft size={20}/></button>
          <div className="mt-8">
            <h2 className="text-2xl font-black uppercase tracking-tight">Create Organization</h2>
            <p className="text-slate-400 font-medium mt-1">Start your 14-day free trial</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold flex gap-2">
              <CheckCircle2 size={16} className="rotate-45" /> {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Organization Name</label>
              <div className="relative">
                <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-100 transition-all" placeholder="e.g. Acme Corp" value={formData.orgName} onChange={e => setFormData({...formData, orgName: e.target.value})} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Admin Full Name</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-100 transition-all" placeholder="e.g. John Doe" value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="email" required className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-100 transition-all" placeholder="name@company.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="password" required className="w-full pl-14 pr-2 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-100 transition-all" placeholder="********" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Confirm</label>
                <div className="relative">
                  <input type="password" required className="w-full pl-5 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-100 transition-all" placeholder="********" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all disabled:opacity-50">
            {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <>Complete Registration <ArrowRight size={20}/></>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterOrganization;
