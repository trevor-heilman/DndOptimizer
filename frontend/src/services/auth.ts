/**
 * Authentication API service
 */
import apiClient from './api';
import { storage } from '../utils/storage';
import type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  AuthTokens,
} from '../types/api';

export const authService = {
  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/users/register/', data);
    const { access, refresh, user } = response.data;

    storage.setAccessToken(access);
    storage.setRefreshToken(refresh);
    storage.setUser(user);

    return response.data;
  },

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/users/login/', data);
    const { access, refresh, user } = response.data;

    storage.setAccessToken(access);
    storage.setRefreshToken(refresh);
    storage.setUser(user);

    return response.data;
  },

  /**
   * Logout user
   */
  logout(): void {
    storage.clearAll();
    window.location.href = '/login';
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/users/me/');
    storage.setUser(response.data);
    return response.data;
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = storage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<AuthTokens>('/users/token/refresh/', {
      refresh: refreshToken,
    });

    const { access, refresh } = response.data;
    storage.setAccessToken(access);
    if (refresh) {
      storage.setRefreshToken(refresh);
    }

    return response.data;
  },

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/users/change_password/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!storage.getAccessToken();
  },
};

export default authService;
