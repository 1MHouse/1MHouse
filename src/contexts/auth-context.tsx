
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { useToast } from "@/hooks/use-toast";

// IMPORTANT: Set this to the email address you created for the admin in the Firebase Console
const ADMIN_EMAIL = "admin@example.com"; // Replace with your actual admin email

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) {
      console.warn("[AuthContext] Firebase Auth is not initialized. Admin features may not work.");
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setIsLoading(false);
      console.log("[AuthContext] onAuthStateChanged: User:", currentUser?.email, "IsAdmin:", currentUser?.email === ADMIN_EMAIL);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!auth) {
      toast({ title: "Authentication Error", description: "Firebase Auth not available.", variant: "destructive" });
      return false;
    }
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user && userCredential.user.email === ADMIN_EMAIL) {
        // setUser and setIsAdmin will be handled by onAuthStateChanged
        console.log("[AuthContext] Login successful for admin:", userCredential.user.email);
        setIsLoading(false);
        return true;
      } else {
        // Not the designated admin email, sign them out.
        await signOut(auth);
        toast({ title: "Login Failed", description: "Not an authorized admin account.", variant: "destructive" });
        setIsLoading(false);
        return false;
      }
    } catch (error: any) {
      console.error("[AuthContext] Login error:", error);
      let errorMessage = "Invalid credentials or login error.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = "Invalid email or password.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.";
      }
      toast({ title: "Login Failed", description: errorMessage, variant: "destructive" });
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    if (!auth) {
      console.warn("[AuthContext] Firebase Auth not initialized. Cannot logout properly.");
      // Still attempt to clear local state if auth is missing
      setUser(null);
      setIsAdmin(false);
      router.push('/');
      return;
    }
    setIsLoading(true);
    try {
      await signOut(auth);
      // setUser(null) and setIsAdmin(false) will be handled by onAuthStateChanged
      console.log("[AuthContext] Logout successful.");
      router.push('/'); 
    } catch (error) {
      console.error("[AuthContext] Logout error:", error);
      toast({ title: "Logout Error", description: "Failed to logout. Please try again.", variant: "destructive"});
    } finally {
      // Ensure loading is set to false even if onAuthStateChanged takes a moment
      // or if there was an error before it could fire.
      setIsLoading(false); 
    }
  };
  

  return (
    <AuthContext.Provider value={{ user, isAdmin, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
