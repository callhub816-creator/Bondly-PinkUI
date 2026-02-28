
/**
 * Helper for authenticated fetches with Auto-Refresh
 * Currently used in AuthContext and now available for direct use.
 */
export const authFetch = async (url: string, options: any = {}) => {
    // STRICT FIX: Always include credentials for cookies to be sent
    const finalOptions = {
        ...options,
        credentials: "include" as RequestCredentials
    };

    let res = await fetch(url, finalOptions);

    // If 401, attempt refresh automatically
    if (res.status === 401) {
        const refreshRes = await fetch('/api/auth/refresh', { method: 'POST', credentials: "include" });
        if (refreshRes.ok) {
            // Retry original request
            res = await fetch(url, finalOptions);
        }
    }
    return res;
};
