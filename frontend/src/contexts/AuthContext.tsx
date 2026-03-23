import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginInput, RegisterInput } from '../types';
import { authService } from '../services/auth.service';

interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (role: string) => boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  resetPassword: (token: string, password: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const userData = await authService.getMe();
      setUser(userData);
    } catch {
      setUser(null);
    }

    setIsLoading(false);
  }

  async function login(data: LoginInput) {
    const response = await authService.login(data);
    setUser(response.user);
  }

  async function register(data: RegisterInput) {
    const response = await authService.register(data);
    setUser(response.user);
  }

  async function logout() {
    try {
      await authService.logout();
    } catch {
      // Client state must be cleared even if API logout fails.
    }
    setUser(null);
  }

  async function requestPasswordReset(email: string) {
    return authService.forgotPassword({ email });
  }

  async function resetPassword(token: string, password: string) {
    return authService.resetPassword({ token, password });
  }

  function hasRole(role: string) {
    return user?.roles?.includes(role) ?? false;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        hasRole,
        login,
        register,
        logout,
        requestPasswordReset,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
