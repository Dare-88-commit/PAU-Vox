import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";

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
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ) => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem("pau_vox_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Determine role based on email content for easy testing
      let assignedRole: UserRole = "student";

      const lowerEmail = email.toLowerCase();
      if (lowerEmail.includes("affairs"))
        assignedRole = "student_affairs";
      else if (lowerEmail.includes("facilities"))
        assignedRole = "facilities_management";
      else if (lowerEmail.includes("academic"))
        assignedRole = "academic_staff";
      else if (lowerEmail.includes("head"))
        assignedRole = "department_head";
      else if (lowerEmail.includes("mgmt"))
        assignedRole = "university_management";
      else if (lowerEmail.includes("admin"))
        assignedRole = "ict_admin";

      const mockUser: User = {
        id: "1",
        email,
        name: email.split("@")[0].replace(".", " "),
        role: assignedRole,
        verified: true,
      };

      setUser(mockUser);
      localStorage.setItem(
        "pau_vox_user",
        JSON.stringify(mockUser),
      );
    } finally {
      setLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ) => {
    setLoading(true);
    try {
      // Validate PAU email
      if (!email.endsWith("@pau.edu.ng")) {
        throw new Error("Only @pau.edu.ng emails are allowed");
      }

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockUser: User = {
        id: Date.now().toString(),
        email,
        name,
        role,
        verified: false,
      };

      setUser(mockUser);
      localStorage.setItem(
        "pau_vox_user",
        JSON.stringify(mockUser),
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (code: string) => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (code.length === 6) {
        const updatedUser = { ...user!, verified: true };
        setUser(updatedUser);
        localStorage.setItem(
          "pau_vox_user",
          JSON.stringify(updatedUser),
        );
      } else {
        throw new Error("Invalid verification code");
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("pau_vox_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        verifyEmail,
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
    throw new Error(
      "useAuth must be used within an AuthProvider",
    );
  }
  return context;
}