import { createContext, useContext, useEffect, useState } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const signInWithGoogle = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists, if not create user document
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          apiKey: '', // To be filled by user
        });
      } else {
        // Load existing API key
        const userData = userSnap.data();
        if (userData.apiKey) setApiKey(userData.apiKey);
      }
    } catch (error) {
      console.error("Error signing in with Google", error);
      setError(error.message);
    }
  };

  const updateApiKey = async (newKey) => {
    if (!user) return;
    try {
        const userRef = doc(db, 'users', user.uid);
        // Use setDoc with merge: true to handle cases where the user document doesn't exist
        await setDoc(userRef, { apiKey: newKey }, { merge: true });
        setApiKey(newKey);
    } catch (error) {
        console.error("Error updating API key:", error);
        throw error;
    }
  };

  const logout = () => {
    setApiKey('');
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch extra user data like API Key
        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                setApiKey(userSnap.data().apiKey || '');
            }
        } catch (e) {
            console.error("Error fetching user data", e);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    apiKey,
    updateApiKey,
    signInWithGoogle,
    logout,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
