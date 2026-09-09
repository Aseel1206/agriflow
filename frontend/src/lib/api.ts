const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("agriflow_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.detail || message;
    } catch {
      // ignore body parse failure, fall back to statusText
    }
    throw new ApiError(res.status, typeof message === "string" ? message : JSON.stringify(message));
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
};

export function saveSession(token: string, role: string, userId: string) {
  localStorage.setItem("agriflow_token", token);
  localStorage.setItem("agriflow_role", role);
  localStorage.setItem("agriflow_user_id", userId);
}

export function clearSession() {
  localStorage.removeItem("agriflow_token");
  localStorage.removeItem("agriflow_role");
  localStorage.removeItem("agriflow_user_id");
}

export function getSession(): { token: string; role: string; userId: string } | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("agriflow_token");
  const role = localStorage.getItem("agriflow_role");
  const userId = localStorage.getItem("agriflow_user_id");
  if (!token || !role || !userId) return null;
  return { token, role, userId };
}
