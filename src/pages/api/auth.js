export const prerender = false;

export const POST = async ({ request }) => {
    try {
        const body = await request.json();
        const type = body?.type;

        console.log(`[API Auth] Received request:`, { type, keys: Object.keys(body || {}) });

        if (type === 'login') {
            const { username, password } = body;

            // 1. Init Session
            console.log('[API Auth] Initializing Riot session...');
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
                console.error('[API Auth] No cookies received from Riot Init');
                return new Response(JSON.stringify({ error: 'Riot did not return session cookies.' }), { status: 502 });
            }

            // 2. Auth with credentials
            console.log('[API Auth] Submitting credentials to Riot...');
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

            console.log('[API Auth] Riot response type:', result.type || result.error || 'success');

            // Return Riot's response along with its status code
            return new Response(JSON.stringify(result), {
                status: authResponse.status,
                headers: {
                    'Set-Cookie': setCookies,
                    'Content-Type': 'application/json'
                }
            });
        }

        if (type === 'mfa') {
            const { code } = body;
            const cookies = request.headers.get('cookie');

            console.log('[API Auth] Submitting MFA code...');
            const mfaResponse = await fetch('https://auth.riotgames.com/api/v1/authorization', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': cookies
                },
                body: JSON.stringify({ type: 'mfa', code, remember: true })
            });

            const result = await mfaResponse.json();
            const setCookies = mfaResponse.headers.get('set-cookie');

            return new Response(JSON.stringify(result), {
                status: mfaResponse.status,
                headers: {
                    'Set-Cookie': setCookies,
                    'Content-Type': 'application/json'
                }
            });
        }

        console.warn('[API Auth] Invalid type received:', type);
        return new Response(JSON.stringify({
            error: `Invalid type: ${type}`,
            received: body
        }), { status: 400 });

    } catch (err) {
        console.error('[API Auth] Fatal Error:', err.message);
        return new Response(JSON.stringify({ error: `Server error: ${err.message}` }), { status: 500 });
    }
};
