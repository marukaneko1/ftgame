import axios from "axios";

// API URL configuration
// Set NEXT_PUBLIC_API_URL in Vercel environment variables to your backend API URL
// Example: https://ftgame-api-xxx.vercel.app (no trailing slash)
// For local development, defaults to localhost:3001
const getApiBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  // Remove trailing slash if present to avoid double slashes
  return url.replace(/\/$/, "");
};

const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle token refresh on 401 responses
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    // Skip refresh for auth endpoints (login, register, refresh) to avoid infinite loops
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                          originalRequest.url?.includes('/auth/register') ||
                          originalRequest.url?.includes('/auth/refresh');
    
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            } else {
              return Promise.reject(new Error("Token refresh failed"));
            }
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token - refresh token should be in HTTP-only cookie
        const response = await api.post<LoginResponse>("/auth/refresh", {}, { withCredentials: true });
        const { accessToken } = response.data;
        
        if (accessToken) {
          localStorage.setItem("accessToken", accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          processQueue(null, accessToken);
          return api(originalRequest);
        } else {
          throw new Error("No access token in refresh response");
        }
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        
        // Don't redirect if we're in an active session or on play/matchmaking pages
        // The existing token might still be valid for WebSocket connections
        // Only redirect if we're on a regular page and have no token at all
        const isInSession = typeof window !== "undefined" && window.location.pathname.includes("/session/");
        const isOnPlayPage = typeof window !== "undefined" && window.location.pathname.includes("/play");
        const isOnAuthPage = typeof window !== "undefined" && window.location.pathname.includes("/auth");
        const hasTokenInStorage = typeof window !== "undefined" && !!localStorage.getItem("accessToken");
        
        // Only redirect if:
        // 1. Not in session/play/auth pages
        // 2. No token in localStorage (truly logged out)
        // 3. Original request was not a refresh attempt (to avoid redirect loops)
        const shouldRedirect = !isInSession && 
                               !isOnPlayPage && 
                               !isOnAuthPage && 
                               !hasTokenInStorage &&
                               !originalRequest.url?.includes("/auth/refresh");
        
        if (shouldRedirect) {
          // Refresh failed and no token - user needs to log in again
          localStorage.removeItem("accessToken");
          console.error("[API] Token refresh failed and no token available, redirecting to login");
          window.location.href = "/auth/login";
        } else {
          // Don't redirect - token might still be valid for WebSocket or we're in an active flow
          if (isInSession || isOnPlayPage) {
            console.warn("[API] Token refresh failed but continuing - token may still be valid for WebSocket");
          }
          // Don't remove token - it might still work for WebSocket connections
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export interface LoginResponse {
  accessToken: string;
}

export interface RegisterResponse {
  accessToken: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
}

export interface Subscription {
  id: string;
  status: string;
  startedAt?: string;
  currentPeriodEnd?: string;
}

export interface Wallet {
  id: string;
  balanceTokens: number;
  transactions: Array<{
    id: string;
    type: string;
    amountTokens: number;
    createdAt: string;
  }>;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  username: string;
  is18PlusVerified: boolean;
  subscription?: Subscription;
  wallet?: Wallet;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/auth/login", { email, password });
    if (response.data.accessToken) {
      localStorage.setItem("accessToken", response.data.accessToken);
    }
    return response.data;
  },
  register: async (email: string, password: string, displayName: string, username: string, dateOfBirth: string): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>("/auth/register", {
      email,
      password,
      displayName,
      username,
      dateOfBirth
    });
    if (response.data.accessToken) {
      localStorage.setItem("accessToken", response.data.accessToken);
    }
    return response.data;
  },
  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
    localStorage.removeItem("accessToken");
  }
};

export const subscriptionsApi = {
  getMySubscription: async (): Promise<Subscription | null> => {
    const response = await api.get<Subscription | null>("/subscriptions/me");
    return response.data;
  },
  createBasicCheckout: async (): Promise<CheckoutResponse> => {
    const response = await api.post<CheckoutResponse>("/subscriptions/basic/create-checkout-session");
    return response.data;
  }
};

export const walletApi = {
  getMyWallet: async (): Promise<Wallet | null> => {
    const response = await api.get<Wallet | null>("/wallet/me");
    return response.data;
  },
  createTokenPackCheckout: async (packId: string): Promise<CheckoutResponse> => {
    const response = await api.post<CheckoutResponse>("/wallet/token-pack", { packId });
    return response.data;
  }
};

export const usersApi = {
  getMe: async (): Promise<User> => {
    const response = await api.get<User>("/users/me");
    return response.data;
  }
};

export const videoApi = {
  getAppId: async (): Promise<{ appId: string | null }> => {
    try {
      const response = await api.get<{ appId: string | null }>("/video/app-id");
      return response.data;
    } catch (error: any) {
      // If API returns error (e.g., 500, 400, or any error), return null appId (allows app to work without Agora)
      // Silently handle - don't log error details to avoid noise, just return null
      // This is expected when Agora credentials are not configured
      if (error.response?.status !== 500 && error.response?.status !== 400) {
        // Only log non-expected errors
        console.warn("⚠️ Agora App ID endpoint failed - video features will be disabled");
      }
      return { appId: null };
    }
  },
  getToken: async (sessionId: string): Promise<{ token: string; channelName: string; expiresAt: string }> => {
    const response = await api.get<{ token: string; channelName: string; expiresAt: string }>(`/video/token?sessionId=${sessionId}`);
    return response.data;
  },
  getRoomToken: async (roomId: string): Promise<{ token: string; channelName: string; expiresAt: string }> => {
    const response = await api.get<{ token: string; channelName: string; expiresAt: string }>(`/video/room-token?roomId=${roomId}`);
    return response.data;
  }
};

// Room types
export interface RoomListItem {
  id: string;
  title: string;
  description: string | null;
  hostName: string;
  region: string;
  entryFeeTokens: number;
  hasPassword: boolean;
  participantCount: number;
  maxMembers: number;
  status: string;
  currentRound: any | null;
}

export interface CreateRoomData {
  title: string;
  description?: string;
  password?: string;
  maxMembers?: number;
  region?: string;
  entryFeeTokens?: number;
  isPublic?: boolean;
}

export const roomsApi = {
  getPublicRooms: async (region?: string): Promise<RoomListItem[]> => {
    const query = region ? `?region=${region}` : "";
    const response = await api.get<RoomListItem[]>(`/rooms${query}`);
    return response.data;
  },
  getRoomDetails: async (roomId: string): Promise<any> => {
    const response = await api.get(`/rooms/${roomId}`);
    return response.data;
  },
  createRoom: async (data: CreateRoomData): Promise<any> => {
    const response = await api.post("/rooms", data);
    return response.data;
  },
  joinRoom: async (roomId: string, password?: string): Promise<any> => {
    const response = await api.post(`/rooms/${roomId}/join`, { password });
    return response.data;
  },
  leaveRoom: async (roomId: string): Promise<any> => {
    const response = await api.post(`/rooms/${roomId}/leave`);
    return response.data;
  },
  endRoom: async (roomId: string): Promise<any> => {
    const response = await api.post(`/rooms/${roomId}/end`);
    return response.data;
  }
};

