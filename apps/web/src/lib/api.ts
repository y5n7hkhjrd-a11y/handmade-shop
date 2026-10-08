const DEV_API_URL = 'http://localhost:4000/api';

/**
 * Resolve the API base URL.
 *
 * `NEXT_PUBLIC_API_URL` always wins when set (it is inlined at build time by
 * Next.js). When it is missing — e.g. it was never added to the Vercel
 * project's environment variables — we derive the URL at runtime from the
 * current hostname so the deployed app works without any dashboard config:
 *
 *   https://handmade-shop-web-staging.vercel.app  →  https://handmade-shop-api-staging.vercel.app/api
 *   https://handmade-shop-web-prod.vercel.app     →  https://handmade-shop-api-prod.vercel.app/api
 */
function resolveApiUrl(): string {
  if (typeof window === 'undefined') return DEV_API_URL;
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return DEV_API_URL;
  if (hostname.includes('-web-')) {
    return `https://${hostname.replace('-web-', '-api-')}/api`;
  }
  return DEV_API_URL;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || resolveApiUrl();

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
}

export async function apiClient<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, token } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `API error: ${response.status}`);
  }

  return data;
}

// Auth helpers
export const authApi = {
  login: (username: string, password: string) =>
    apiClient<{ success: boolean; data: { token: string; user: any } }>('/auth/login', {
      method: 'POST',
      body: { username, password },
    }),

  register: (data: {
    username: string;
    password: string;
    name: string;
    role?: string;
    email?: string;
  }) =>
    apiClient<{ success: boolean; data: any }>('/auth/register', {
      method: 'POST',
      body: data,
    }),

  getProfile: (token: string) =>
    apiClient<{ success: boolean; data: any }>('/auth/profile', { token }),
};

// Generic CRUD helpers
export function createCrudApi<T>(endpoint: string) {
  return {
    list: (params?: Record<string, string>, token?: string) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiClient<{ success: boolean; data: T[]; pagination: any }>(`${endpoint}${query}`, {
        token,
      });
    },

    getById: (id: string, token?: string) =>
      apiClient<{ success: boolean; data: T }>(`${endpoint}/${id}`, { token }),

    create: (data: Partial<T>, token?: string) =>
      apiClient<{ success: boolean; data: T }>(`${endpoint}`, {
        method: 'POST',
        body: data,
        token,
      }),

    update: (id: string, data: Partial<T>, token?: string) =>
      apiClient<{ success: boolean; data: T }>(`${endpoint}/${id}`, {
        method: 'PUT',
        body: data,
        token,
      }),

    delete: (id: string, token?: string) =>
      apiClient<{ success: boolean; message: string }>(`${endpoint}/${id}`, {
        method: 'DELETE',
        token,
      }),
  };
}
