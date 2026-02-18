import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '../services/firebase';
import { storage } from '../services/storage';
import { localDB } from '../services/localDB';
import { 
  User, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithPopup
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  apiKey: string;
  loading: boolean;
  error: string | null;
  loginAsGuest: () => void;
  signInWithGoogle: () => Promise<any>;
  signInWithEmail: (email: string, pass: string) => Promise<User>;
  signUpWithEmail: (email: string, pass: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  reauthenticate: () => Promise<void>;
  updateApiKey: (newKey: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return localStorage.getItem('auth_isGuest') === 'true';
  });
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const GUEST_USER = {
    uid: 'guest',
    email: 'guest@local.dev',
    displayName: 'Guest User',
    emailVerified: true,
    isAnonymous: true,
    phoneNumber: null,
    photoURL: null,
    providerId: 'guest',
    tenantId: null,
    metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString()
    },
    providerData: [],
    refreshToken: '',
    delete: async () => {},
    getIdToken: async () => '',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
  } as unknown as User;

  const loginAsGuest = () => {
    setIsGuest(true);
    setUser(GUEST_USER);
    localStorage.setItem('auth_isGuest', 'true');
    // Default settings for guest
    localStorage.setItem('settings_saveLocally', 'true');
    localStorage.setItem('settings_saveToCloud', 'false');
  };

  const signInWithGoogle = async () => {
    setError(null);
    
    // Clear local data to avoid conflicts between Guest data and User data
    await localDB.clearAllData();

    setIsGuest(false);
    localStorage.removeItem('auth_isGuest');
    // Force enable cloud sync on login
    localStorage.setItem('settings_saveToCloud', 'true');
    localStorage.setItem('settings_saveLocally', 'true');
    
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // Check if user doc exists, if not create it
      let userDoc = await storage.get('users', userCredential.user.uid);
      
      if (!userDoc) {
        userDoc = {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          apiKey: '',
          createdAt: new Date().toISOString()
        };
        await storage.save('users', userDoc);
      }
      
      // Set API Key immediately
      setApiKey(userDoc.apiKey || userDoc.api_key || '');

      return userCredential.user;
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      setError(error.message);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setError(null);
    
    // Clear local data to avoid conflicts
    await localDB.clearAllData();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // Force enable cloud sync on login
      localStorage.setItem('settings_saveToCloud', 'true');
      localStorage.setItem('settings_saveLocally', 'true');

      // Check if user doc exists, if not create it
      let userDoc = await storage.get('users', userCredential.user.uid);
      
      if (!userDoc) {
        userDoc = {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          apiKey: '',
          createdAt: new Date().toISOString()
        };
        await storage.save('users', userDoc);
      }
      
      // Set API Key immediately
      setApiKey(userDoc.apiKey || userDoc.api_key || '');

      return userCredential.user;
    } catch (error: any) {
      console.error("Error signing in with Email:", error);
      setError(error.message);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    setError(null);
    
    // Clear local data to avoid conflicts
    await localDB.clearAllData();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      
      // Force enable cloud sync on login
      localStorage.setItem('settings_saveToCloud', 'true');
      localStorage.setItem('settings_saveLocally', 'true');

      // Create user doc
      const userDoc = {
        id: userCredential.user.uid,
        email: userCredential.user.email,
        apiKey: '',
        createdAt: new Date().toISOString()
      };
      await storage.save('users', userDoc);
      
      // Set API Key immediately
      setApiKey('');
      
      return userCredential.user;
    } catch (error: any) {
      console.error("Error signing up with Email:", error);
      setError(error.message);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      setError(error.message);
      throw error;
    }
  };

  const updateUserPassword = async (password: string) => {
    setError(null);
    if (!auth.currentUser) throw new Error("No user logged in");
    try {
      await updatePassword(auth.currentUser, password);
    } catch (error: any) {
      console.error("Error updating password:", error);
      setError(error.message);
      throw error;
    }
  };

  const reauthenticate = async () => {
    setError(null);
    if (!auth.currentUser) throw new Error("No user logged in");
    
    try {
        const providerId = auth.currentUser.providerData[0]?.providerId;
        
        // If user logged in with Google, re-auth with Google
        if (providerId === GoogleAuthProvider.PROVIDER_ID) {
            const provider = new GoogleAuthProvider();
            await reauthenticateWithPopup(auth.currentUser, provider);
        } else {
            // For other providers (like email/password), we can't easily re-auth with popup without password.
            // But since this flow is mainly for Google users setting a password, we might be hitting this
            // if a user is technically "logged in" but session is old.
            // We'll throw specific error to let UI handle it.
            throw new Error("Please log out and log in again to verify your identity.");
        }
    } catch (error: any) {
        console.error("Error reauthenticating:", error);
        setError(error.message);
        throw error;
    }
  };

  const updateApiKey = async (newKey: string) => {
    if (!user) return;
    try {
        const userDoc = await storage.get('users', user.uid);
        if (userDoc) {
            await storage.update('users', user.uid, {
                apiKey: newKey
            });
        } else {
            await storage.save('users', {
                id: user.uid,
                email: user.email,
                apiKey: newKey,
                createdAt: new Date().toISOString()
            });
        }
        setApiKey(newKey);
    } catch (error) {
        console.error("Error updating API key:", error);
        throw error;
    }
  };

  const logout = async () => {
    setApiKey('');
    
    // Clear local data to ensure next user starts fresh
    await localDB.clearAllData();
    
    // Handle guest logout
    if (isGuest) {
        setIsGuest(false);
        localStorage.removeItem('auth_isGuest');
        // We do NOT clear settings_saveLocally or local DB so data persists
        setUser(null);
    }

    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser && isGuest) {
          setUser(GUEST_USER);
      } else {
          setUser(currentUser);
      }
      
      if (currentUser) {
        // Fetch API key
        try {
            const data = await storage.get('users', currentUser.uid);
            if (data) {
                setApiKey(data.apiKey || data.api_key || '');
            }
        } catch (err) {
            console.error("Error fetching user data:", err);
        }
      } else {
        setApiKey('');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isGuest]);

  const value = {
    user,
    isGuest,
    apiKey,
    loading,
    error,
    loginAsGuest,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    updateUserPassword,
    reauthenticate,
    updateApiKey,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
