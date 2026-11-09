import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  KeyRound, 
  Mail, 
  ArrowLeft, 
  ShieldCheck, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Lock, 
  RefreshCw, 
  AlertCircle,
  Check
} from 'lucide-react';

interface ResetPasswordPageProps {
  initialEmail?: string;
  onSuccess: () => void;
  onNavigate: (view: string, param?: string) => void;
}

type ResetStep = 'request_otp' | 'verify_otp' | 'set_new_password' | 'success';

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  initialEmail = '',
  onSuccess,
  onNavigate
}) => {
  const { requestPasswordResetOtp, verifyPasswordResetOtp, completePasswordReset } = useAuth();

  const [step, setStep] = useState<ResetStep>('request_otp');
  const [email, setEmail] = useState<string>(initialEmail);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [resetToken, setResetToken] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [devOtpNotice, setDevOtpNotice] = useState<string | undefined>();

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Pre-fill email if passed as prop
  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Auto-focus first OTP input when transitioning to verify_otp
  useEffect(() => {
    if (step === 'verify_otp') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Step 1: Send OTP to verify email
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessNotice('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid official business email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await requestPasswordResetOtp(cleanEmail);
      if (!res.success) {
        setError(res.error || 'Failed to send verification code. Please check your email address.');
        return;
      }

      setDevOtpNotice(res.devOtp);
      setSuccessNotice(`A 6-digit verification code has been sent to ${cleanEmail}.`);
      setResendCooldown(25);
      setStep('verify_otp');
    } catch (err: any) {
      setError(err?.message || 'Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP input changes
  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric inputs
    const cleanVal = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (cleanVal.length > 1) {
      // Handle paste
      const pasted = cleanVal.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      const nextFocus = Math.min(pasted.length, 5);
      otpInputRefs.current[nextFocus]?.focus();
      return;
    }

    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    // Auto move to next input if single character was entered
    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const otpCode = otpDigits.join('').trim();
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    try {
      setLoading(true);
      const res = await verifyPasswordResetOtp(email.trim().toLowerCase(), otpCode);
      if (!res.success) {
        setError(res.error || 'Invalid or expired verification code. Please try again.');
        return;
      }

      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
      setSuccessNotice('Email address verified successfully. Please enter your new password.');
      setStep('set_new_password');
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Password Reset
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify and retype.');
      return;
    }

    const otpCode = otpDigits.join('').trim();

    try {
      setLoading(true);
      const res = await completePasswordReset(
        email.trim().toLowerCase(),
        otpCode,
        newPassword,
        resetToken
      );

      if (!res.success) {
        setError(res.error || 'Failed to update password. Please try again.');
        return;
      }

      setStep('success');
    } catch (err: any) {
      setError(err?.message || 'Server connection error updating password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col justify-between font-sans antialiased text-[#0F1111] selection:bg-[#ffd814] selection:text-black">
      
      {/* Top Brand Bar */}
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

      {/* Main Container Card */}
      <main className="w-full max-w-[460px] mx-auto px-4 py-4 flex-1 flex flex-col justify-center">
        <div className="bg-white border border-gray-300 rounded-2xl p-6 sm:p-8 shadow-sm">
          
          {/* STEP 1: Request OTP */}
          {step === 'request_otp' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                  Reset Password
                </h1>
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <KeyRound size={20} />
                </div>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 mb-6 leading-relaxed">
                Enter your account email address
              </p>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-3.5 rounded-md text-xs sm:text-sm mb-5 flex items-start gap-2 shadow-2xs">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                  <div className="font-medium">{error}</div>
                </div>
              )}

              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block font-bold text-gray-800 mb-1.5 text-xs sm:text-sm">
                    Registered Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      autoFocus
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#e77600] focus:ring-2 focus:ring-[#e77600]/30 transition-all bg-white"
                    />
                    <Mail size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#ffd814] hover:bg-[#f7ca00] active:bg-[#f0b800] text-gray-900 font-bold py-2.5 sm:py-3 px-4 rounded-lg border border-[#fcd200] shadow-sm hover:shadow transition-all text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <span>Send Verification Code</span>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-blue-700 hover:text-blue-900 font-semibold hover:underline cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Return to Sign In</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Verify OTP */}
          {step === 'verify_otp' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                  Verify Email
                </h1>
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <ShieldCheck size={20} />
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 mb-5 leading-relaxed">
                A 6-digit verification code was dispatched from <span className="font-bold">noreply@spineldistribution.com</span> to <span className="font-bold underline">{email}</span>.
              </div>

              {devOtpNotice && (
                <div className="mb-4 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center justify-between">
                  <span>Development Verification Code:</span>
                  <span className="font-mono font-bold tracking-widest text-sm bg-white px-2 py-0.5 rounded border border-blue-300">
                    {devOtpNotice}
                  </span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-3.5 rounded-md text-xs sm:text-sm mb-5 flex items-start gap-2 shadow-2xs">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                  <div className="font-medium">{error}</div>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block font-bold text-gray-800 mb-2 text-xs sm:text-sm text-center">
                    Enter 6-Digit Verification Code
                  </label>
                  
                  {/* 6 Digit Input Boxes */}
                  <div className="flex justify-center items-center gap-2 sm:gap-2.5">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e.target)}
                        className="w-11 h-12 sm:w-12 sm:h-13 text-center text-xl sm:text-2xl font-bold rounded-lg border border-gray-300 focus:border-[#e77600] focus:ring-2 focus:ring-[#e77600]/30 outline-none transition-all bg-white"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length !== 6}
                  className="w-full bg-[#ffd814] hover:bg-[#f7ca00] active:bg-[#f0b800] text-gray-900 font-bold py-2.5 sm:py-3 px-4 rounded-lg border border-[#fcd200] shadow-sm hover:shadow transition-all text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <span>Verify Code &amp; Continue</span>
                  )}
                </button>
              </form>

              {/* Resend and Change Email options */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={() => handleRequestOtp()}
                  className="text-blue-700 hover:text-blue-900 font-semibold disabled:text-gray-400 disabled:cursor-not-allowed hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={12} className={resendCooldown > 0 ? '' : 'text-blue-600'} />
                  {resendCooldown > 0 ? (
                    <span>Resend code in {resendCooldown}s</span>
                  ) : (
                    <span>Resend verification code</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('request_otp');
                    setOtpDigits(['', '', '', '', '', '']);
                    setError('');
                  }}
                  className="text-gray-600 hover:text-gray-900 font-medium hover:underline cursor-pointer"
                >
                  Change email address
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Set New Password */}
          {step === 'set_new_password' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                  New Password
                </h1>
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <Lock size={20} />
                </div>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 mb-5 leading-relaxed">
                Your email has been verified. Please choose a strong new password for <span className="font-semibold text-gray-800">{email}</span>.
              </p>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-3.5 rounded-md text-xs sm:text-sm mb-5 flex items-start gap-2 shadow-2xs">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                  <div className="font-medium">{error}</div>
                </div>
              )}

              <form onSubmit={handleSetNewPassword} className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="block font-bold text-gray-800 mb-1.5 text-xs sm:text-sm">
                    Enter New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#e77600] focus:ring-2 focus:ring-[#e77600]/30 transition-all bg-white"
                    />
                    <Lock size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
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

                {/* Confirm New Password */}
                <div>
                  <label className="block font-bold text-gray-800 mb-1.5 text-xs sm:text-sm">
                    Re-enter New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#e77600] focus:ring-2 focus:ring-[#e77600]/30 transition-all bg-white"
                    />
                    <Lock size={16} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-2.5 p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Password validation indicators */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1.5">
                  <div className={`flex items-center gap-1.5 ${newPassword.length >= 6 ? 'text-emerald-700 font-medium' : 'text-gray-500'}`}>
                    <Check size={14} className={newPassword.length >= 6 ? 'text-emerald-600' : 'text-gray-400'} />
                    <span>At least 6 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${newPassword && newPassword === confirmPassword ? 'text-emerald-700 font-medium' : 'text-gray-500'}`}>
                    <Check size={14} className={newPassword && newPassword === confirmPassword ? 'text-emerald-600' : 'text-gray-400'} />
                    <span>Passwords match</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="w-full mt-2 bg-[#ffd814] hover:bg-[#f7ca00] active:bg-[#f0b800] text-gray-900 font-bold py-2.5 sm:py-3 px-4 rounded-lg border border-[#fcd200] shadow-sm hover:shadow transition-all text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
                      <span>Saving New Password...</span>
                    </>
                  ) : (
                    <span>Save New Password &amp; Continue</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 4: Success Confirmation */}
          {step === 'success' && (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center border-2 border-emerald-200">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Password Updated!
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 max-w-sm mx-auto leading-relaxed">
                  Your Spinel Distribution password has been changed successfully. You can now log in using your new credentials.
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-700">
                Account: <span className="font-semibold text-gray-900">{email}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  onNavigate('login');
                }}
                className="w-full bg-[#ffd814] hover:bg-[#f7ca00] active:bg-[#f0b800] text-gray-900 font-bold py-3 px-4 rounded-lg border border-[#fcd200] shadow-sm hover:shadow transition-all text-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Proceed to Sign In</span>
              </button>
            </div>
          )}

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
          <button type="button" onClick={() => onNavigate('login')} className="hover:text-blue-700 hover:underline cursor-pointer">
            Sign In
          </button>
        </div>
        <p className="text-[11px] text-gray-500">
          &copy; {new Date().getFullYear()} Spinel Distribution Global. Enterprise Security, Networking &amp; Hazardous Zone Equipment.
        </p>
      </footer>

    </div>
  );
};
