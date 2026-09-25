import { CHAT_API_URL } from '../config/env.ts';

export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

const TOKEN_KEY = 'nexo_auth_token';

export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Ignore storage quota errors
  }
};

export const clearStoredToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
};

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${CHAT_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Error al iniciar sesión');
  }

  setStoredToken(data.token);
  return data as AuthResponse;
}

export async function registerUser(
  email: string,
  password: string,
  nombre?: string,
): Promise<AuthResponse> {
  const res = await fetch(`${CHAT_API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, nombre }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Error al crear la cuenta');
  }

  setStoredToken(data.token);
  return data as AuthResponse;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch(`${CHAT_API_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      clearStoredToken();
      return null;
    }

    const data = (await res.json()) as { user: AuthUser };
    return data.user;
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  const token = getStoredToken();
  clearStoredToken();

  if (token) {
    fetch(`${CHAT_API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => {});
  }
}
