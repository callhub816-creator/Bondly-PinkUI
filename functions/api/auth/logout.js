
export async function onRequestPost() {
    return new Response(JSON.stringify({ success: true }), {
        headers: {
            "Content-Type": "application/json",
            "Set-Cookie": "auth_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"
        }
    });
}
