import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { MailCheck, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

interface OtpVerificationPageProps {
  email: string;
  fullName?: string;
  devOtp?: string;
  onSuccess: () => void;
  onNavigate: (view: string, param?: string) => void;
  onBackToSignup: () => void;
}

export const OtpVerificationPage: React.FC<OtpVerificationPageProps> = ({
  email,
  fullName,
  devOtp,
  onSuccess,
  onNavigate,
  onBackToSignup
}) => {
  const { customerVerifyOtp, customerResendOtp } = useAuth();
  const [digits, setDigits] = useState<string[]>(() => {
    if (devOtp && devOtp.length === 6) return devOtp.split('');
    return ['', '', '', '', '', ''];
  });
  const [activeDevOtp, setActiveDevOtp] = useState<string | undefined>(devOtp);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(20);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus the first input box on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Countdown timer for code resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    setError('');
    const cleanValue = value.replace(/\D/g, ''); // Digits only

    if (!cleanValue) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    // If pasted multiple digits
    if (cleanValue.length > 1) {
      const pasted = cleanValue.slice(0, 6).split('');
      const newDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Single digit input
    const newDigits = [...digits];
    newDigits[index] = cleanValue;
    setDigits(newDigits);

    // Advance to next box if available
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setDigits(newDigits);
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const otp = digits.join('').trim();
    if (otp.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    try {
      setLoading(true);
      const res = await customerVerifyOtp(email, otp);
      if (!res.success) {
        setError(res.error || 'Invalid 6-digit verification code. Please check your email and try again.');
        return;
      }

      setSuccessMsg('Account verified successfully! Redirecting...');
      setTimeout(() => {
        onSuccess();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setError('');
    setSuccessMsg('');

    try {
      setResending(true);
      const res = await customerResendOtp(email);
      if (res.success) {
        setSuccessMsg(res.message || 'A new 6-digit verification code has been sent to your email.');
        if (res.devOtp) {
          setActiveDevOtp(res.devOtp);
          setDigits(res.devOtp.split(''));
        } else {
          setDigits(['', '', '', '', '', '']);
        }
        setCountdown(20);
        inputRefs.current[0]?.focus();
      } else {
        setError(res.error || 'Failed to resend code. Please wait a moment and try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error while resending verification code.');
    } finally {
      setResending(false);
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

      {/* Main OTP Card Container */}
      <main className="w-full max-w-[480px] mx-auto px-4 py-2 flex-1 flex flex-col justify-center">
        <div className="bg-white border border-gray-300 rounded-xl p-6 sm:p-8 shadow-sm">
          
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Verify Email
            </h1>
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <MailCheck size={20} />
            </div>
          </div>

          <p className="text-xs sm:text-sm text-gray-600 mb-2 leading-relaxed">
            We sent a 6-digit verification code to:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs sm:text-sm font-semibold text-gray-800 break-all mb-5 flex items-center justify-between">
            <span>{email || 'your email address'}</span>
            <button
              type="button"
              onClick={onBackToSignup}
              className="text-xs text-blue-700 hover:underline font-normal cursor-pointer ml-2 shrink-0"
            >
              Change
            </button>
          </div>

          {/* Clean Error Alert */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-3.5 rounded-md text-xs sm:text-sm mb-5 flex items-start gap-2 shadow-xs">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {/* Clean Success Alert */}
          {successMsg && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-3.5 rounded-md text-xs sm:text-sm mb-5 flex items-start gap-2 shadow-xs">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* Verification Code helper if provided */}
          {activeDevOtp && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 mb-5 flex items-center justify-between shadow-xs">
              <div>
                <span className="font-semibold text-gray-700">Verification Code: </span>
                <span className="font-mono text-sm tracking-widest font-bold ml-1 text-amber-950">{activeDevOtp}</span>
              </div>
              <button
                type="button"
                onClick={() => setDigits(activeDevOtp.split(''))}
                className="bg-amber-200 hover:bg-amber-300 text-amber-900 px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer transition"
              >
                Auto-fill
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-bold text-gray-800 mb-2 text-xs sm:text-sm text-center">
                Enter 6-Digit OTP Code
              </label>

              {/* 6 Individual Digit Inputs */}
              <div className="flex justify-between gap-2 sm:gap-2.5 max-w-[340px] mx-auto">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-lg border outline-none transition-all ${
                      digit 
                        ? 'border-[#e77600] bg-amber-50/40 text-gray-900 ring-2 ring-[#e77600]/20' 
                        : 'border-gray-300 bg-white text-gray-900 focus:border-[#e77600] focus:ring-2 focus:ring-[#e77600]/30'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Primary Verify Button */}
            <button
              type="submit"
              disabled={loading || digits.join('').length !== 6}
              className="w-full bg-[#ffd814] hover:bg-[#f7ca00] active:bg-[#f0b800] text-gray-900 font-bold py-2.5 sm:py-3 px-4 rounded-lg border border-[#fcd200] shadow-sm hover:shadow transition-all text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Verify &amp; Complete Registration</span>
                </>
              )}
            </button>
          </form>

          {/* Resend Section */}
          <div className="mt-6 pt-5 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500 mb-2">
              Didn't receive the email? Check your spam folder or request a new code.
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || resending}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                countdown > 0 || resending
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-amber-700 hover:text-amber-800 hover:underline'
              }`}
            >
              <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
              <span>
                {resending
                  ? 'Sending new code...'
                  : countdown > 0
                  ? `Resend code in ${countdown}s`
                  : 'Resend Verification Code'}
              </span>
            </button>
          </div>

        </div>

        {/* Back to Signup / Home Link */}
        <div className="mt-5 text-center flex items-center justify-center gap-4 text-xs">
          <button
            type="button"
            onClick={onBackToSignup}
            className="inline-flex items-center gap-1.5 text-gray-600 hover:text-black font-semibold hover:underline cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Back to Signup Form</span>
          </button>
          <span className="text-gray-300">•</span>
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="text-gray-600 hover:text-black font-semibold hover:underline cursor-pointer"
          >
            Sign in to existing account
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
