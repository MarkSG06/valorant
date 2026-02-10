export const POST = async ({ request }) => {
    try {
        const body = await request.json();
        const { type, ...data } = body;

        // Use a persistent Cookie jar strategy (simplified for the proxy)
        // In a real production app, we would manage session affinity better.

        if (type === 'init') {
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
            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Set-Cookie': cookies, 'Content-Type': 'application/json' }
            });
        }

        if (type === 'auth') {
            const { username, password } = data;
            const cookies = request.headers.get('cookie');

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

            return new Response(JSON.stringify(result), {
                headers: { 'Set-Cookie': setCookies, 'Content-Type': 'application/json' }
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
            const setCookies = mfaResponse.headers.get('set-cookie');

            return new Response(JSON.stringify(result), {
                headers: { 'Set-Cookie': setCookies, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400 });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
