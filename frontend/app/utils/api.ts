export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("access_token") : null;
    return {
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
};

export const authenticatedFetch = (url: string, options: RequestInit = {}) => {
    const defaultHeaders: Record<string, string> = getAuthHeaders();

    // If body is not FormData, add default JSON content type
    if (!(options.body instanceof FormData)) {
        defaultHeaders["Content-Type"] = "application/json";
    }

    return fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...(options.headers || {})
        },
        credentials: "include" as const
    });
};
