import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  adminToken: string | null;
  customerLogin: (email: string, name?: string) => Promise<void>;
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
            // Token expired or invalid
            adminLogout();
          } else {
            setIsAdmin(true);
          }
        })
        .catch(() => {
          // Keep offline if server briefly rebooting
        });
    }
  }, [adminToken]);

  const customerLogin = async (email: string, name?: string) => {
    const profile: UserProfile = {
      id: `usr_${Date.now()}`,
      email: email.trim().toLowerCase(),
      fullName: name || email.split('@')[0],
      role: 'customer',
      createdAt: new Date().toISOString()
    };
    setUser(profile);
    localStorage.setItem('spinel_user', JSON.stringify(profile));
  };

  const customerLogout = () => {
    setUser(null);
    localStorage.removeItem('spinel_user');
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
