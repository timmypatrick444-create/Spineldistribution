import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Eye, EyeOff, ArrowLeft, ShieldCheck, Mail, KeyRound, Building2, Phone, User, CheckCircle2 } from 'lucide-react';

interface SignupPageProps {
  onSuccess: () => void;
  onNavigate: (view: string, param?: string) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSuccess, onNavigate }) => {
  const { customerLogin } = useAuth();
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phoneNumber.trim();

    if (!cleanFullName) {
      setError('Please provide your full legal or corporate contact name.');
      return;
    }

    if (!cleanEmail) {
      setError('Please provide a valid official business email.');
      return;
    }

    if (!cleanPhone) {
      setError('Please provide your corporate telephone or WhatsApp number.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your confirmation password.');
      return;
    }

    if (!agreeTerms) {
      setError('Please accept the Conditions of Use and Privacy Notice to continue.');
      return;
    }

    try {
      setLoading(true);
      await customerLogin(cleanEmail, cleanFullName);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to create enterprise account.');
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
              (e.target as HTMLImageElement).src = 'https://res.cloudinary.com/bmv4hvtk/image/upload/v1788619290/Spinel_Distribution.jpg';
            }}
          />
        </button>
      </header>

      {/* Main Registration Card Container */}
      <main className="w-full max-w-[480px] mx-auto px-4 py-2 flex-1 flex flex-col justify-center">
        <div className="bg-white border border-gray-300 rounded-xl p-6 sm:p-8 shadow-sm">
          
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Create Account
            </h1>
            <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <UserPlus size={18} />
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            Register your enterprise or individual profile for volume contractor pricing, direct RFQs, and order tracking.
          </p>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-3.5 rounded-md text-xs sm:text-sm mb-5 flex items-start gap-2 shadow-xs">
              <div className="font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="block font-bold text-gray-800 mb-1 text-xs sm:text-sm">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="name"
                  placeholder="First and last name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#e77600] focus:ring-2 focus:ring-[#e77600]/30 transition-all bg-white"
                />
                <User size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Company / Organization (Optional) */}
            <div>
              <label className="block font-bold text-gray-800 mb-1 text-xs sm:text-sm">
                Company / Organization <span className="text-gray-400 font-normal text-xs">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoComplete="organization"
                  placeholder="e.g. Apex Security Systems Ltd"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#e77600] focus:ring-2 focus:ring-[#e77600]/30 transition-all bg-white"
                />
                <Building2 size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Business Email */}
            <div>
              <label className="block font-bold text-gray-800 mb-1 text-xs sm:text-sm">
                Business Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#e77600] focus:ring-2 focus:ring-[#e77600]/30 transition-all bg-white"
                />
                <Mail size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block font-bold text-gray-800 mb-1 text-xs sm:text-sm">
                Phone / WhatsApp Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  placeholder="+234 816 963 2070"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#e77600] focus:ring-2 focus:ring-[#e77600]/30 transition-all bg-white"
                />
                <Phone size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block font-bold text-gray-800 mb-1 text-xs sm:text-sm">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
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

            {/* Confirm Password */}
            <div>
              <label className="block font-bold text-gray-800 mb-1 text-xs sm:text-sm">
                Re-enter Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#e77600] focus:ring-2 focus:ring-[#e77600]/30 transition-all bg-white"
                />
                <KeyRound size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Agreement checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-gray-700 leading-tight">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="rounded text-[#e77600] focus:ring-[#e77600] w-4 h-4 mt-0.5 cursor-pointer"
                />
                <span>
                  I agree to Spinel Distribution's Conditions of Use, B2B wholesale transaction terms, and Privacy Notice.
                </span>
              </label>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 bg-[#ffd814] hover:bg-[#f7ca00] active:bg-[#f0b800] text-gray-900 font-bold py-2.5 sm:py-3 px-4 rounded-lg border border-[#fcd200] shadow-sm hover:shadow transition-all text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create your Spinel account</span>
              )}
            </button>
          </form>

          {/* Clean Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <span className="relative bg-white px-3 text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
              Already have an account?
            </span>
          </div>

          {/* Link to Dedicated Login Page */}
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 px-4 rounded-lg border border-gray-300 shadow-2xs hover:shadow-xs cursor-pointer transition-colors text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <span>Sign in to existing account</span>
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
