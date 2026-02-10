export const prerender = false;

export const POST = async ({ request }) => {
    try {
        const body = await request.json();
        const type = body?.type;

        // Realistic User-Agent to avoid Riot's bot detection/location filtering
        const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

        console.log(`[API Auth] Incoming ${type} request...`);

        if (type === 'login') {
            const { username, password } = body;

            // 1. Initial Session Handshake (Get Cookies)
            // We use the same parameters as the official Valorant client login
            const initResponse = await fetch('https://auth.riotgames.com/api/v1/authorization', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': USER_AGENT
                },
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
                console.error('[API Auth] No cookies from Init');
                return new Response(JSON.stringify({ error: 'No se pudo iniciar sesión con Riot (Cookies missing).' }), { status: 502 });
            }

            // 2. Submit Credentials
            const authResponse = await fetch('https://auth.riotgames.com/api/v1/authorization', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': cookies,
                    'User-Agent': USER_AGENT
                },
                body: JSON.stringify({
                    type: 'auth',
                    username,
                    password,
                    remember: true,
                    language: 'es_ES' // Force Spanish locale
                })
            });

            const result = await authResponse.json();
            const setCookies = authResponse.headers.get('set-cookie');

            console.log('[API Auth] Result:', result.type || result.error || 'success');

            // Return Riot's response and cookies (important for MFA step)
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

            const mfaResponse = await fetch('https://auth.riotgames.com/api/v1/authorization', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': cookies,
                    'User-Agent': USER_AGENT
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

        return new Response(JSON.stringify({ error: 'Tipo de petición inválido' }), { status: 400 });

    } catch (err) {
        console.error('[API Auth] Catch Error:', err.message);
        return new Response(JSON.stringify({ error: `Fallo del servidor: ${err.message}` }), { status: 500 });
    }
};
