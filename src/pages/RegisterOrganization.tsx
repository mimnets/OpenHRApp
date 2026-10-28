
import React, { useEffect, useState } from 'react';
import { Building2, User, Mail, Lock, ArrowRight, Loader2, ArrowLeft, CheckCircle2, Globe, KeyRound } from 'lucide-react';
import { hrService } from '../services/hrService';
import Turnstile from '../components/shared/Turnstile';
import { COUNTRIES, getFlagEmoji } from '../data/countries';

interface Props {
  onBack: () => void;
  onSuccess: (user: any) => void;
}

type Step = 'email' | 'code' | 'details' | 'done';

const STEP_INFO: Record<Step, { title: string; subtitle: string; index: number }> = {
  email:   { title: 'Create Organization',  subtitle: 'Step 1 of 3 · Your work email', index: 1 },
  code:    { title: 'Check your inbox',     subtitle: 'Step 2 of 3 · Verify email',    index: 2 },
  details: { title: 'Organization details', subtitle: 'Step 3 of 3 · Almost done',     index: 3 },
  done:    { title: 'Welcome aboard',       subtitle: 'Your organization is ready',    index: 3 },
};

const RESEND_COOLDOWN_S = 60;

const inputClass = 'w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-100 transition-all';
const labelClass = 'text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1';
const primaryButtonClass = 'w-full py-5 bg-primary text-white rounded-xl font-semibold uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-primary-hover transition-all disabled:opacity-50';

const RegisterOrganization: React.FC<Props> = ({ onBack, onSuccess }) => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [formData, setFormData] = useState({
    orgName: '',
    adminName: '',
    password: '',
    confirmPassword: '',
    country: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [resendIn, setResendIn] = useState(0);

  const captchaEnabled = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  // Turnstile tokens are single-use — the spent one cannot be replayed, so
  // force a fresh challenge after every send attempt.
  const resetTurnstile = () => {
    setTurnstileToken('');
    setTurnstileReset(n => n + 1);
  };

  const sendCode = async (): Promise<boolean> => {
    if (captchaEnabled && !turnstileToken) {
      setError('Please complete the anti-spam check.');
      return false;
    }
    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    const result = await hrService.startRegistration(email, turnstileToken);
    setIsSubmitting(false);
    resetTurnstile();
    if (!result.success) {
      setError(result.error || 'Could not send the verification code.');
      return false;
    }
    setResendIn(RESEND_COOLDOWN_S);
    return true;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await sendCode()) {
      setCode('');
      setStep('code');
    }
  };

  const handleResend = async () => {
    if (await sendCode()) setNotice('A new code is on its way.');
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    const result = await hrService.verifyRegistrationCode(email, code);
    setIsSubmitting(false);
    if (!result.accessToken) {
      setError(result.error || 'That code is not right. Check the email and try again.');
      return;
    }
    setAccessToken(result.accessToken);
    setStep('details');
  };

  const handleChangeEmail = () => {
    setError(null);
    setNotice(null);
    setCode('');
    setStep('email');
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await hrService.registerOrganization({
      accessToken,
      orgName: formData.orgName,
      adminName: formData.adminName,
      password: formData.password,
      country: formData.country,
    });

    setIsSubmitting(false);
    if (result.success) {
      setStep('done');
    } else {
      setError(result.error || 'Registration failed.');
    }
  };

  const handleGoToDashboard = async () => {
    setIsSubmitting(true);
    setError(null);
    const result = await hrService.login(email, formData.password);
    if (result.user) {
      setFormData(f => ({ ...f, password: '', confirmPassword: '' }));
      onSuccess(result.user);
      return;
    }
    setIsSubmitting(false);
    setError(`${result.error || 'Could not sign you in.'} Your organization was created, so you can sign in from the login page.`);
  };

  const info = STEP_INFO[step];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#f8fafc] relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[100px] rounded-full -z-10"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[100px] rounded-full -z-10"></div>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8">
        <div className="bg-slate-900 p-8 text-white relative">
          {step !== 'done' && (
            <button onClick={step === 'code' ? handleChangeEmail : onBack} aria-label="Back" className="absolute left-8 top-8 p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"><ArrowLeft size={20}/></button>
          )}
          <div className="mt-8">
            <h2 className="text-2xl font-semibold uppercase tracking-tight">{info.title}</h2>
            {/* Not a trial. The TRIAL subscription status is an ad-free window,
                after which an organization continues free on AD_SUPPORTED, or
                stays ad-free by donating (ACTIVE). "Start your 14-day free
                trial" implied the product started costing money on day 15 and
                contradicted the site's own FAQ, which states there is no trial
                period because OpenHRApp is permanently free. */}
            <p className="text-slate-400 font-medium mt-1">{step === 'email' ? 'Free forever — your first 14 days are ad-free' : info.subtitle}</p>
            <div className="flex gap-1.5 mt-5" aria-label={`Step ${info.index} of 3`}>
              {[1, 2, 3].map(i => (
                <span key={i} className={`h-1 flex-1 rounded-full ${i <= info.index ? 'bg-primary' : 'bg-white/20'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-10 space-y-6">
          {error && (
            <div role="alert" className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold flex gap-2">
              <CheckCircle2 size={16} className="rotate-45 shrink-0" /> {error}
            </div>
          )}
          {notice && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-xs font-bold">{notice}</div>
          )}

          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-6" autoComplete="on">
              <div className="space-y-1">
                <label htmlFor="reg-email" className={labelClass}>Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input id="reg-email" type="email" name="email" autoComplete="email" required autoFocus className={inputClass} placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <p className="text-xs text-slate-500 px-1 pt-1">We'll email you a verification code to confirm it's yours.</p>
              </div>

              <Turnstile onVerify={setTurnstileToken} resetSignal={turnstileReset} className="flex justify-center" />

              <button type="submit" disabled={isSubmitting || (captchaEnabled && !turnstileToken)} className={primaryButtonClass}>
                {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <>Send verification code <ArrowRight size={20}/></>}
              </button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleCodeSubmit} className="space-y-6">
              <p className="text-sm text-slate-600">
                We sent a code to <span className="font-semibold text-slate-800 break-all">{email}</span>
              </p>
              <div className="space-y-1">
                <label htmlFor="reg-code" className={labelClass}>Verification Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  {/* Supabase OTP length is a project setting (6 by default), so accept 6–10 digits. */}
                  <input id="reg-code" name="one-time-code" autoComplete="one-time-code" inputMode="numeric" required autoFocus maxLength={10} pattern="[0-9]{6,10}" className={`${inputClass} tracking-[0.4em] text-lg`} placeholder="Enter code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-xs leading-relaxed">
                <span className="font-semibold">Not there? Check your spam or junk folder.</span> It comes from <span className="font-mono">noreply@openhrapp.com</span>.
              </div>

              <button type="submit" disabled={isSubmitting || code.length < 6} className={primaryButtonClass}>
                {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <>Verify <ArrowRight size={20}/></>}
              </button>

              {resendIn <= 0 && <Turnstile onVerify={setTurnstileToken} resetSignal={turnstileReset} className="flex justify-center" />}

              <div className="flex justify-between gap-3 text-sm font-semibold">
                <button type="button" onClick={handleChangeEmail} className="text-primary hover:underline">Change email</button>
                <button type="button" onClick={handleResend} disabled={isSubmitting || resendIn > 0 || (captchaEnabled && !turnstileToken)} className="text-primary hover:underline disabled:text-slate-400 disabled:no-underline">
                  {resendIn > 0 ? `Resend in 0:${String(resendIn).padStart(2, '0')}` : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          {step === 'details' && (
            <form onSubmit={handleDetailsSubmit} className="space-y-6" autoComplete="on">
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className={labelClass}>Work Email</span>
                  <div className="flex items-center justify-between gap-3 px-5 py-4 bg-emerald-50 rounded-2xl text-sm font-bold text-slate-800">
                    <span className="break-all">{email}</span>
                    <span className="flex items-center gap-1 text-emerald-600 text-xs shrink-0"><CheckCircle2 size={14} /> Verified</span>
                  </div>
                  {/* Lets password managers file the new password under this email. */}
                  <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
                </div>

                <div className="space-y-1">
                  <label htmlFor="reg-org" className={labelClass}>Organization Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input id="reg-org" name="organization" autoComplete="organization" required autoFocus className={inputClass} placeholder="e.g. Acme Corp" value={formData.orgName} onChange={e => setFormData({...formData, orgName: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="reg-country" className={labelClass}>Country</label>
                  <div className="relative">
                    <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <select id="reg-country" required className={`${inputClass} appearance-none`} value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})}>
                      <option value="" disabled>Select country...</option>
                      {COUNTRIES.map(country => (
                        <option key={country.code} value={country.code}>
                          {getFlagEmoji(country.code)} {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="reg-name" className={labelClass}>Admin Full Name</label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input id="reg-name" name="name" autoComplete="name" required className={inputClass} placeholder="e.g. John Doe" value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="reg-password" className={labelClass}>Password</label>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input id="reg-password" type="password" name="new-password" autoComplete="new-password" required minLength={8} className={`${inputClass} pr-2`} placeholder="********" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="reg-confirm" className={labelClass}>Confirm</label>
                    <input id="reg-confirm" type="password" name="confirm-password" autoComplete="new-password" required className={`${inputClass} pl-5`} placeholder="********" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                  </div>
                </div>
                <p className="text-xs text-slate-500 px-1">You can add your logo and address later from the setup checklist.</p>
              </div>

              <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
                {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <>Complete Registration <ArrowRight size={20}/></>}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center text-center gap-5">
              <div className="p-4 bg-emerald-50 rounded-full">
                <CheckCircle2 size={48} className="text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">{formData.orgName} is ready</h3>
                <p className="text-sm text-slate-500">Free forever. Your first 14 days are ad-free.</p>
              </div>
              <button onClick={handleGoToDashboard} disabled={isSubmitting} className={primaryButtonClass}>
                {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <>Go to dashboard <ArrowRight size={20}/></>}
              </button>
              {error && <button onClick={onBack} className="text-sm font-semibold text-primary hover:underline">Back to home</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterOrganization;
