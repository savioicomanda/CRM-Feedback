'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface CompanySettings {
  name: string;
  description: string;
  logoUrl: string;
}

interface AuthContextType {
  user: User | any | null;
  loading: boolean;
  companySettings: CompanySettings;
  login: () => Promise<void>;
  loginWithCredentials: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const DEFAULT_SETTINGS: CompanySettings = {
  name: 'The Ledger',
  description: 'Edição Maître D\'',
  logoUrl: ''
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | any | null>(null);
  const [loading, setLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'company'), (doc) => {
      if (doc.exists()) {
        setCompanySettings(doc.data() as CompanySettings);
      } else {
        setCompanySettings(DEFAULT_SETTINGS);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSettings();
    };
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      localStorage.removeItem('crm_admin_session');
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const loginWithCredentials = async (username: string, password: string): Promise<boolean> => {
    if (username === 'admin' && password === 'vfewq!@34') {
      const email = 'admin@crmfeedback.com';
      try {
        await signInWithEmailAndPassword(auth, email, password);
        return true;
      } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          // Try to create the admin user if it doesn't exist (first run)
          try {
            await createUserWithEmailAndPassword(auth, email, password);
            return true;
          } catch (createError: any) {
            console.error('Error creating admin:', createError);
            throw createError;
          }
        }
        console.error('Login error:', error);
        throw error;
      }
    }
    return false;
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('crm_admin_session');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, companySettings, login, loginWithCredentials, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  return context;
};
