"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Store token
      const token = await result.user.getIdToken();
      localStorage.setItem("firebase_token", token);
    } catch (error) {
      console.error("[AuthContext] Sign in with Google error:", error);
      throw error;
    }
  };

  const signInWithGithub = async () => {
    const provider = new GithubAuthProvider();
    // Request email scope
    provider.addScope("user:email");
    try {
      const result = await signInWithPopup(auth, provider);
      // Store token
      const token = await result.user.getIdToken();
      localStorage.setItem("firebase_token", token);
    } catch (error) {
      console.error("[AuthContext] Sign in with GitHub error:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const token = await result.user.getIdToken();
      localStorage.setItem("firebase_token", token);
    } catch (error) {
      console.error("[AuthContext] Sign up with email error:", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const token = await result.user.getIdToken();
      localStorage.setItem("firebase_token", token);
    } catch (error) {
      console.error("[AuthContext] Sign in with email error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("firebase_token");
    } catch (error) {
      console.error("[AuthContext] Sign out error:", error);
      throw error;
    }
  };

  const refreshToken = async () => {
    try {
      if (!auth.currentUser) {
        console.warn("[AuthContext] No user to refresh token for");
        return;
      }
      // Force refresh the ID token to get updated custom claims
      const token = await auth.currentUser.getIdToken(true);
      localStorage.setItem("firebase_token", token);
      console.log("[AuthContext] Token refreshed successfully");
    } catch (error) {
      console.error("[AuthContext] Token refresh error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithGithub, signUpWithEmail, signInWithEmail, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
