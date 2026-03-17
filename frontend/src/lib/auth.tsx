"use client";

import {
  Auth,
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  ReactNode,
  createContext,
  useEffect,
  useState,
  useContext,
} from "react";

import { getFirebaseAuth } from "@/lib/firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const googleProvider = new GoogleAuthProvider();

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [auth] = useState<Auth | null>(() => getFirebaseAuth());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => auth !== null);

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, [auth]);

  const value: AuthContextValue = {
    user,
    loading,
    signInWithGoogle: async () => {
      if (!auth) {
        throw new Error("Firebase Auth is not configured");
      }

      await signInWithPopup(auth, googleProvider);
    },
    signOut: async () => {
      if (!auth) {
        return;
      }

      await firebaseSignOut(auth);
    },
    getIdToken: async () => {
      if (!auth?.currentUser) {
        return null;
      }

      return auth.currentUser.getIdToken();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
