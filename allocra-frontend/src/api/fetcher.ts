import { useAuth } from "@clerk/clerk-react";

export function useFetcher() {
  const { getToken } = useAuth();

  return async function fetcher<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await getToken();

    const res = await fetch(`http://localhost:8000${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    return res.json();
  };
}