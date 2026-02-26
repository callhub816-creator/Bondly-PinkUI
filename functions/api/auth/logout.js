
export async function onRequestPost({ request }) {
    const isSecure = new URL(request.url).protocol === 'https:';
    const secureAttr = isSecure ? ' Secure;' : '';
    const clearAuth = `auth_token=; Path=/; HttpOnly;${secureAttr} SameSite=Strict; Max-Age=0`;
    const clearRefresh = `refresh_token=; Path=/; HttpOnly;${secureAttr} SameSite=Strict; Max-Age=0`;

    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("Set-Cookie", clearAuth);
    headers.append("Set-Cookie", clearRefresh);

    return new Response(JSON.stringify({ success: true }), { headers });
}
