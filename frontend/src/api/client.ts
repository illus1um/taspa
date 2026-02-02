export const API_BASE =
  import.meta.env.VITE_API_BASE?.toString() || "/api";

export const getToken = () => localStorage.getItem("taspa_token");

export const setToken = (token: string) => {
  localStorage.setItem("taspa_token", token);
};

export const clearToken = () => {
  localStorage.removeItem("taspa_token");
};

type ApiOptions = RequestInit & { auth?: boolean };

export const apiFetch = async (path: string, options: ApiOptions = {}) => {
  const { auth = true, headers, ...rest } = options;
  const mergedHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...(headers || {}),
  };
  if (auth) {
    const token = getToken();
    if (token) {
      mergedHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: mergedHeaders,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
};
