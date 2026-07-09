import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

// Create authenticated headers
const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {};
  
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return headers;
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const authHeaders = getAuthHeaders();
  const headers: HeadersInit = { ...authHeaders };
  
  // Only set content-type for JSON data
  if (data && !(data instanceof FormData)) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  // Handle auth errors
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  await throwIfResNotOk(res);
  
  // Return JSON or text based on content-type
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
