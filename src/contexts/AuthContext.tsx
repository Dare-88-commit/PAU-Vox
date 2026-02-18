import React, { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

export type UserRole =
  | "student"
  | "academic_staff"
  | "student_affairs"
  | "facilities_management"
  | "department_head"
  | "university_management"
  | "ict_admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  verified: boolean;
  isMajorAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  resendVerificationCode: () => Promise<void>;
  logout: () => void;
  loading: boolean;
}

type BackendUser = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string | null;
  is_verified: boolean;
  is_major_admin?: boolean;
};

type LoginResponse = {
  access_token: string;
  token_type: string;
  user: BackendUser;
};

type PendingSignup = {
  email: string;
  password: string;
  name: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "pau_vox_token";
const USER_KEY = "pau_vox_user";
const PENDING_SIGNUP_KEY = "pau_vox_pending_signup";

function mapBackendUser(user: BackendUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.full_name,
    role: user.role,
    department: user.department || undefined,
    verified: user.is_verified,
    isMajorAdmin: !!user.is_major_admin,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      const storedUser = localStorage.getItem(USER_KEY);
      const storedToken = localStorage.getItem(TOKEN_KEY);

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      if (storedToken) {
        setToken(storedToken);
        try {
          const backendUser = await apiRequest<BackendUser>("/auth/me", {
            token: storedToken,
          });
          const mapped = mapBackendUser(backendUser);
          setUser(mapped);
          localStorage.setItem(USER_KEY, JSON.stringify(mapped));
        } catch {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }
      }
      setLoading(false);
    };

    void initialize();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      const mapped = mapBackendUser(data.user);
      setUser(mapped);
      setToken(data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(mapped));
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.removeItem(PENDING_SIGNUP_KEY);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      await apiRequest<{ message: string }>("/auth/signup", {
        method: "POST",
        body: {
          email,
          password,
          full_name: name,
        },
      });

      const pending: PendingSignup = { email, password, name };
      localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(pending));

      const placeholder: User = {
        id: "pending",
        email,
        name,
        role: "student",
        verified: false,
        isMajorAdmin: false,
      };
      setUser(placeholder);
      localStorage.setItem(USER_KEY, JSON.stringify(placeholder));
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (code: string) => {
    setLoading(true);
    try {
      const pendingRaw = localStorage.getItem(PENDING_SIGNUP_KEY);
      if (!pendingRaw) {
        throw new Error("No pending signup found. Please sign up again.");
      }
      const pending = JSON.parse(pendingRaw) as PendingSignup;

      await apiRequest<{ message: string }>("/auth/verify-email", {
        method: "POST",
        body: { email: pending.email, code },
      });

      await login(pending.email, pending.password);
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationCode = async () => {
    const pendingRaw = localStorage.getItem(PENDING_SIGNUP_KEY);
    if (!pendingRaw) {
      throw new Error("No pending signup found.");
    }
    const pending = JSON.parse(pendingRaw) as PendingSignup;
    await apiRequest<{ message: string }>("/auth/resend-code", {
      method: "POST",
      body: { email: pending.email },
    });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PENDING_SIGNUP_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        login,
        signup,
        verifyEmail,
        resendVerificationCode,
        logout,
        loading,
      }}
    >
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
