export const prerender = false;

export const POST = async ({ request }) => {
    try {
        const body = await request.json();
        const { type, ...data } = body;

        console.log(`[API Auth] Processing ${type} request...`);

        // Consolidate Init + Auth to manage cookies internally in a single server hop
        if (type === 'login') {
            const { username, password } = data;

            // 1. Init Session
            const initResponse = await fetch('https://auth.riotgames.com/api/v1/authorization', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: 'play-valorant-web-prod',
                    nonce: '1',
                    redirect_uri: 'https://playvalorant.com/opt_in',
                    response_type: 'token id_token',
                    scope: 'account openid'
                })
            });

            const cookies = initResponse.headers.get('set-cookie');
            if (!cookies) {
                return new Response(JSON.stringify({ error: 'Failed to initialize session (No cookies)' }), { status: 500 });
            }

            // 2. Auth with credentials
            const authResponse = await fetch('https://auth.riotgames.com/api/v1/authorization', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': cookies
                },
                body: JSON.stringify({ type: 'auth', username, password, remember: true })
            });

            const result = await authResponse.json();
            const setCookies = authResponse.headers.get('set-cookie');

            // Send result and MFA cookies back to client
            return new Response(JSON.stringify(result), {
                headers: {
                    'Set-Cookie': setCookies,
                    'Content-Type': 'application/json'
                }
            });
        }

        if (type === 'mfa') {
            const { code } = data;
            const cookies = request.headers.get('cookie');

            const mfaResponse = await fetch('https://auth.riotgames.com/api/v1/authorization', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': cookies
                },
                body: JSON.stringify({ type: 'mfa', code, remember: true })
            });

            const result = await mfaResponse.json();
            return new Response(JSON.stringify(result), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400 });

    } catch (err) {
        console.error('[API Auth] Error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
