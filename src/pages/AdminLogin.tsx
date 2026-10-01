import React, { useState } from 'react';
import { Shield, KeyRound, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminLoginProps {
  onSuccess: () => void;
  onNavigateHome?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess }) => {
  const { adminLogin } = useAuth();
  const [technicalEmail, setTechnicalEmail] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!technicalEmail || !accessKey) {
      setError('Please provide both Technical Email ID and Access Key.');
      return;
    }

    try {
      setLoading(true);
      await adminLogin(technicalEmail, accessKey);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Access Denied: Invalid Technical Email or Access Key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full py-16 px-[20px] flex flex-col justify-center items-center font-sans">
      <div className="w-full max-w-md bg-white border border-gray-300 rounded-xl shadow-sm p-8 space-y-6">
        
        {/* Security Shield Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto text-[#c45500]">
            <Shield size={28} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            Admin Sign In
          </h1>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              Technical Email ID
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="tech-admin@spineldistribution.com"
                value={technicalEmail}
                onChange={(e) => setTechnicalEmail(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-9 pr-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]"
                required
              />
              <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              Access Key
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="Enter authorized access key"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-9 pr-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]"
                required
              />
              <KeyRound size={16} className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ffd814] hover:bg-[#f7ca00] active:bg-[#f0b800] text-gray-900 font-bold py-2.5 px-4 rounded-lg shadow-xs transition-all cursor-pointer text-xs flex items-center justify-center gap-2 border border-[#fcd200] mt-2"
          >
            <Shield size={15} />
            <span>{loading ? 'Verifying Credentials...' : 'Sign In to Dashboard'}</span>
          </button>
        </form>

      </div>
    </div>
  );
};
