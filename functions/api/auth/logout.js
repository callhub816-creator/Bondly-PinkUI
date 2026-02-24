
export async function onRequestPost({ request }) {
    const isSecure = new URL(request.url).protocol === 'https:';
    const secureAttr = isSecure ? ' Secure;' : '';
    const clearAuth = `auth_token=; Path=/; HttpOnly;${secureAttr} SameSite=Strict; Max-Age=0`;
    const clearRefresh = `refresh_token=; Path=/; HttpOnly;${secureAttr} SameSite=Strict; Max-Age=0`;

    return new Response(JSON.stringify({ success: true }), {
        headers: {
            "Content-Type": "application/json",
            "Set-Cookie": clearAuth,
            "Set-Cookie": clearRefresh
        }
    });
}
