import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginForm, ApiResponse } from '../types';
import api from '../services/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginForm) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

interface LoginResponse extends ApiResponse<{
  user: User;
  token: string;
}> {}

interface UserResponse extends ApiResponse<{
  user: User;
}> {}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.getCurrentUser();
          if (mounted && response.success && response.data) {
            setUser(response.data);
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          localStorage.removeItem('token');
        }
      }
      if (mounted) {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (credentials: LoginForm) => {
    try {
      const response = await api.login(credentials) as LoginResponse;
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Login failed');
      }
      
      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      setUser(userData);
      toast.success('Login successful!');
    } catch (error: unknown) {
      let message = 'Login failed. Please try again.';
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const err = error as { response?: { data?: { message?: string } } };
        message = err.response?.data?.message || message;
      }
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Continue with local logout even if API call fails
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}; 