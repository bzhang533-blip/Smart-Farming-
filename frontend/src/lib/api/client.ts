const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

// Clerk injects itself as window.Clerk after ClerkProvider loads.
// Returns null in SSR, during MSW-only dev, or before session loads.
async function getClerkToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    Clerk?: { session?: { getToken(): Promise<string | null> } };
  };
  return (await w.Clerk?.session?.getToken()) ?? null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await getClerkToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? res.statusText, body.code);
  }

  return res.json() as Promise<T>;
}
