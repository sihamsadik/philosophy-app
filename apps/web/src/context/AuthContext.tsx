import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "@philosophy/contract";
import { agoraClient } from "../lib/api-client.js";

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password?: string) => Promise<void>;
  register: (data: { email: string; password?: string; username?: string; name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setDemoUser: (demoUser: User, token?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = async () => {
    const token = agoraClient.getAuthToken();
    if (!token || token === "mock-auth-token") {
      setUser(null);
      agoraClient.setCurrentUserId("");
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await agoraClient.getMe();
      setUser(currentUser);
      if (currentUser?.id) agoraClient.setCurrentUserId(currentUser.id);
    } catch {
      agoraClient.setAuthToken("");
      agoraClient.setCurrentUserId("");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password?: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await agoraClient.signIn({ email, password });
      setUser(res.user);
      if (res.user?.id) agoraClient.setCurrentUserId(res.user.id);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("agora_notification_updated"));
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { email: string; password?: string; username?: string; name?: string }) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await agoraClient.signUp(data);
      setUser(res.user);
      if (res.user?.id) agoraClient.setCurrentUserId(res.user.id);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("agora_notification_updated"));
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await agoraClient.signOut();
    } finally {
      setUser(null);
      agoraClient.setCurrentUserId("");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("agora_notification_updated"));
      }
      setIsLoading(false);
    }
  };

  const setDemoUser = (demoUser: User, token?: string) => {
    if (token) agoraClient.setAuthToken(token);
    setUser(demoUser);
    if (demoUser?.id) agoraClient.setCurrentUserId(demoUser.id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("agora_notification_updated"));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        refreshUser: fetchCurrentUser,
        setDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
