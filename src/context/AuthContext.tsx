import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  adminToken: string | null;
  customerLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string; pendingVerification?: boolean; email?: string }>;
  customerRegisterInitiate: (fullName: string, email: string, password: string) => Promise<{ success: boolean; error?: string; devOtp?: string; message?: string }>;
  customerVerifyOtp: (email: string, otp: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  customerResendOtp: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  customerLogout: () => void;
  adminLogin: (technicalEmail: string, accessKey: string) => Promise<{ success: boolean; error?: string }>;
  adminLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('spinel_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('spinel_admin_token') || null;
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('spinel_admin_token'));
  });

  // Check admin token validity on mount
  useEffect(() => {
    if (adminToken) {
      fetch('/api/admin/verify', {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
        .then(res => {
          if (!res.ok) {
            adminLogout();
          } else {
            setIsAdmin(true);
          }
        })
        .catch(() => {});
    }
  }, [adminToken]);

  const customerLogin = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Authentication failed. Please check your credentials.',
          pendingVerification: data.pendingVerification,
          email: data.email
        };
      }

      const profile: UserProfile = {
        id: String(data.user.id || `usr_${Date.now()}`),
        email: data.user.email,
        fullName: data.user.fullName || data.user.email.split('@')[0],
        verificationStatus: data.user.verificationStatus || 'Verified',
        createdAt: new Date().toISOString()
      };

      setUser(profile);
      localStorage.setItem('spinel_user', JSON.stringify(profile));
      if (data.token) {
        localStorage.setItem('spinel_user_token', data.token);
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Server connection error during login.'
      };
    }
  };

  const customerRegisterInitiate = async (
    fullName: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; devOtp?: string; message?: string }> => {
    try {
      const res = await fetch('/api/auth/register-initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to initiate account registration.'
        };
      }

      return {
        success: true,
        message: data.message,
        devOtp: data.devOtp
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Server connection error during registration.'
      };
    }
  };

  const customerVerifyOtp = async (
    email: string,
    otp: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Invalid verification code.'
        };
      }

      const profile: UserProfile = {
        id: String(data.user.id || `usr_${Date.now()}`),
        email: data.user.email,
        fullName: data.user.fullName || data.user.email.split('@')[0],
        verificationStatus: data.user.verificationStatus || 'Verified',
        createdAt: new Date().toISOString()
      };

      setUser(profile);
      localStorage.setItem('spinel_user', JSON.stringify(profile));
      if (data.token) {
        localStorage.setItem('spinel_user_token', data.token);
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Connection error during OTP verification.'
      };
    }
  };

  const customerResendOtp = async (
    email: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to resend verification code.'
        };
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error while requesting code resend.'
      };
    }
  };

  const customerLogout = () => {
    setUser(null);
    localStorage.removeItem('spinel_user');
    localStorage.removeItem('spinel_user_token');
  };

  const adminLogin = async (technicalEmail: string, accessKey: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicalEmail, accessKey })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Authentication failed' };
      }

      setAdminToken(data.token);
      setIsAdmin(true);
      localStorage.setItem('spinel_admin_token', data.token);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Server connection error during admin verification' };
    }
  };

  const adminLogout = () => {
    setAdminToken(null);
    setIsAdmin(false);
    localStorage.removeItem('spinel_admin_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        adminToken,
        customerLogin,
        customerRegisterInitiate,
        customerVerifyOtp,
        customerResendOtp,
        customerLogout,
        adminLogin,
        adminLogout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
