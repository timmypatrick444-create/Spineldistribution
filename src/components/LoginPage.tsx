import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, Mail, KeyRound, Building2, UserPlus, CheckCircle2 } from 'lucide-react';

interface LoginPageProps {
  onSuccess: () => void;
  onNavigate: (view: string, param?: string) => void;
  onNavigateToOtp?: (email: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onNavigate, onNavigateToOtp }) => {
  const { customerLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your business or personal email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      const res = await customerLogin(cleanEmail, password);
      if (!res.success) {
        if (res.pendingVerification && res.email) {
          if (onNavigateToOtp) {
            onNavigateToOtp(res.email);
          } else {
            onNavigate('otp-verify');
          }
          return;
        }
        setError(res.error || 'Authentication error. Please verify your credentials.');
        return;
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Authentication error. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col justify-between font-sans antialiased text-[#0F1111] selection:bg-[#ffd814] selection:text-black">
      
      {/* Top Simple Brand Bar */}
      <header className="w-full pt-8 pb-4 px-4 flex flex-col items-center justify-center">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 cursor-pointer group focus:outline-none"
          title="Return to Spinel Distribution Home"
        >
          <img 
            src="https://res.cloudinary.com/bmv4hvtk/image/upload/v1790454463/Spinel_Logo.png"
            alt="SPINEL DISTRIBUTION"
            className="h-12 sm:h-14 w-auto object-contain transition-transform group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Fallback to secondary asset if primary logo unavailable
              (e.target as HTMLImageElement).src = 'https://res.cloudinary.com/bmv4hvtk/image/upload/v1788619290/Spinel_Distribution.jpg';
            }}
          />
        </button>
      </header>

      {/* Main Login Card Container */}
      <main className="w-full max-w-[430px] mx-auto px-4 py-2 flex-1 flex flex-col justify-center">
        <div className="bg-white border border-gray-300 rounded-xl p-6 sm:p-8 shadow-sm">
          
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Sign In
            </h1>
            <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <Lock size={18} />
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            Access your wholesale pricing, verified purchase orders, and official invoices.
          </p>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-3.5 rounded-md text-xs sm:text-sm mb-5 flex items-start gap-2 shadow-xs">
              <div className="font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label className="block font-bold text-gray-800 mb-1.5 text-xs sm:text-sm">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#e77600] focus:ring-2 focus:ring-[#e77600]/30 transition-all bg-white"
                />
                <Mail size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-gray-800 text-xs sm:text-sm">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs text-blue-700 hover:text-blue-900 hover:underline font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#e77600] focus:ring-2 focus:ring-[#e77600]/30 transition-all bg-white"
                />
                <KeyRound size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-[#e77600] focus:ring-[#e77600] w-4 h-4 cursor-pointer"
                />
                <span>Keep me signed in</span>
              </label>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#ffd814] hover:bg-[#f7ca00] active:bg-[#f0b800] text-gray-900 font-bold py-2.5 sm:py-3 px-4 rounded-lg border border-[#fcd200] shadow-sm hover:shadow transition-all text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign in to Spinel Distribution</span>
              )}
            </button>
          </form>

          {/* Legal / Policy terms */}
          <p className="text-[11px] text-gray-500 mt-5 leading-relaxed text-center">
            By signing in, you agree to Spinel Distribution's{' '}
            <span className="text-blue-700 hover:underline cursor-pointer">Conditions of Use</span> and{' '}
            <span className="text-blue-700 hover:underline cursor-pointer">Privacy Notice</span>.
          </p>

          {/* Clean Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <span className="relative bg-white px-3 text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
              New enterprise customer?
            </span>
          </div>

          {/* Link to Dedicated Signup Page */}
          <button
            type="button"
            onClick={() => onNavigate('signup')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 px-4 rounded-lg border border-gray-300 shadow-2xs hover:shadow-xs cursor-pointer transition-colors text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <UserPlus size={16} className="text-gray-600" />
            <span>Create your Spinel account</span>
          </button>

        </div>

        {/* Back to Home / Hardware Catalog */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-black font-semibold hover:underline cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Back to Hardware Catalog</span>
          </button>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-800 rounded-lg shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Password Assistance</h3>
                <p className="text-xs text-gray-500">Official Spinel Security Protocol</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              For corporate enterprise accounts and authorized distributor security, password resets are processed through verification by our administrative technical desk.
            </p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs space-y-1">
              <div><strong>Email:</strong> admin@spineldistribution.com</div>
              <div><strong>Technical Support:</strong> +234 816 963 2070</div>
              <div><strong>Hours:</strong> Mon - Sat (8:00 AM - 6:00 PM WAT)</div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 font-bold text-xs rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Minimal Footer */}
      <footer className="w-full py-6 px-4 text-center border-t border-gray-200 bg-white/70 mt-8">
        <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-600 mb-2">
          <button type="button" onClick={() => onNavigate('home')} className="hover:text-blue-700 hover:underline cursor-pointer">
            Storefront
          </button>
          <button type="button" onClick={() => onNavigate('catalog')} className="hover:text-blue-700 hover:underline cursor-pointer">
            Equipment Catalog
          </button>
          <button type="button" onClick={() => onNavigate('quote')} className="hover:text-blue-700 hover:underline cursor-pointer">
            B2B Quotations
          </button>
          <a href="mailto:sales@spineldistribution.com" className="hover:text-blue-700 hover:underline">
            Contact Support
          </a>
        </div>
        <p className="text-[11px] text-gray-500">
          &copy; {new Date().getFullYear()} Spinel Distribution Global. Enterprise Security, Networking &amp; Renewable Energy.
        </p>
      </footer>

    </div>
  );
};
