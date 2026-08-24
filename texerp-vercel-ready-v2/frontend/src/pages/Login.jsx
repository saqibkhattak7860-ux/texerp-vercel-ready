import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, Upload, X } from 'lucide-react';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, company_name: companyName, email, password, logo_url: logoUrl }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Registration failed');
        setIsRegistering(false);
        setName('');
        setCompanyName('');
        setLogoUrl('');
        setPassword('');
        setError(data.message);
        return;
      }
      const data = await login(email, password);
      if (data.user?.role_name === 'Main Admin') {
        navigate('/main-admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setError('Logo must be an image file of 5MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { setLogoUrl(reader.result); setError(''); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-brand-500/30">
          T
        </div>
        <h2 className="mt-4 text-3xl font-extrabold text-white tracking-tight">
          TexERP Enterprise
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Textile Manufacturing & ERP Management Suite
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 border border-slate-800/80 p-8 rounded-3xl shadow-2xl backdrop-blur-xl space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  placeholder="Your full name"
                />
              </div>
            )}
            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Company Name</label>
                <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500" placeholder="Your company name" />
                <label className="inline-flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer">
                  <Upload className="w-4 h-4" /> Upload company logo
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                {logoUrl && <span className="inline-flex items-center gap-2 ml-3"><img src={logoUrl} alt="Company logo preview" className="h-8 w-8 rounded object-contain bg-white p-0.5" /><button type="button" onClick={() => setLogoUrl('')} className="text-rose-400" title="Remove logo"><X className="w-4 h-4" /></button></span>}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  placeholder="admin@textile.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-700 hover:from-brand-500 hover:to-indigo-600 shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50"
            >
              {loading ? (isRegistering ? 'Submitting Registration...' : 'Authenticating...') : (isRegistering ? 'Submit Registration' : 'Sign In to Portal')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center text-xs text-slate-400">
            {isRegistering ? 'Already have an account?' : 'Need an account?'}{' '}
            <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="font-semibold text-brand-400 hover:text-brand-300">
              {isRegistering ? 'Back to Login' : 'Register here'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
