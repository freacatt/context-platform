import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from '../services/firebase';
import { User, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  apiKey: string;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<any>;
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
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // Check if user doc exists, if not create it
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: userCredential.user.email,
          apiKey: '',
          createdAt: new Date().toISOString()
        });
      }
      return userCredential.user;
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      setError(error.message);
      throw error;
    }
  };

  const updateApiKey = async (newKey: string) => {
    if (!user) return;
    try {
        await setDoc(doc(db, 'users', user.uid), {
            apiKey: newKey
        }, { merge: true });
        setApiKey(newKey);
    } catch (error) {
        console.error("Error updating API key:", error);
        throw error;
    }
  };

  const logout = async () => {
    setApiKey('');
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch API key
        try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
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
  }, []);

  const value = {
    user,
    apiKey,
    loading,
    error,
    signInWithGoogle,
    updateApiKey,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
