'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';

interface CompanySettings {
  name: string;
  description: string;
  logoUrl: string;
  googleReviewUrl?: string;
}

interface UserPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

interface AuthContextType {
  user: (User & { isAdmin?: boolean; permissions?: UserPermissions; name?: string }) | any | null;
  loading: boolean;
  companySettings: CompanySettings;
  loginWithCredentials: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const DEFAULT_SETTINGS: CompanySettings = {
  name: 'The Ledger',
  description: 'Edição Maître D\'',
  logoUrl: '',
  googleReviewUrl: ''
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | any | null>(null);
  const [loading, setLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          const isHardcodedAdmin = firebaseUser.email === 'saviomurillomaia@gmail.com' ||
                                  firebaseUser.email === 'admin@crmfeedback.com';

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              ...firebaseUser,
              ...userData,
              isAdmin: userData.role === 'admin' || isHardcodedAdmin
            });
          } else {
            if (isHardcodedAdmin) {
              const initialData = {
                name: firebaseUser.displayName || (firebaseUser.email?.split('@')[0] || 'Admin'),
                login: firebaseUser.email?.split('@')[0] || 'admin',
                role: 'admin',
                permissions: {
                  canEdit: true,
                  canDelete: true
                }
              };
              await setDoc(userDocRef, initialData);
              setUser({
                ...firebaseUser,
                ...initialData,
                isAdmin: true
              });
            } else {
              setUser({
                ...firebaseUser,
                isAdmin: false
              });
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
      }
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

  const loginWithCredentials = async (username: string, password: string): Promise<boolean> => {
    // Map simple username to internal email if it doesn't look like an email
    const email = username.includes('@') ? username : `${username}@crmfeedback.com`;
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error: any) {
      // Special case for the first run of the 'admin' user
      if (username === 'admin' && password === 'vfewq!@34' && (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential')) {
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
    <AuthContext.Provider value={{ user, loading, companySettings, loginWithCredentials, logout }}>
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
