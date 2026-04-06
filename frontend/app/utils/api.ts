export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem("access_token") : null;
    return {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
};

export const authenticatedFetch = (url: string, options: RequestInit = {}) => {
    return fetch(url, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...(options.headers || {})
        },
        credentials: "include" as const
    });
};
