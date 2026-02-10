const VALORANT_API_BASE = 'https://valorant-api.com/v1';

/**
 * Initiates the Riot login flow via our proxy
 */
export async function loginToRiot(username, password) {
    // 1. Initialize session
    await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'init' })
    });

    // 2. Submit credentials
    const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'auth', username, password })
    });

    if (!response.ok) {
        const text = await response.text();
        console.error('Auth API Error:', text);
        throw new Error(`Error del servidor (${response.status}): El endpoint no se encontró o falló.`);
    }

    return await response.json();
}

/**
 * Submits the MFA code to complete the login
 */
export async function submitMfaCode(code) {
    const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mfa', code })
    });

    return await response.json();
}

/**
 * Extracts Puuid, AccessToken from the final auth response location
 */
export function parseAuthParams(uri) {
    const params = new URLSearchParams(uri.split('#')[1]);
    return {
        accessToken: params.get('access_token'),
        idToken: params.get('id_token'),
        expires: params.get('expires_in')
    };
}

/**
 * Gets the entitlements token from Riot
 */
export async function getEntitlementsToken(accessToken) {
    const response = await fetch('https://entitlements.auth.riotgames.com/api/token/v1', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });
    const data = await response.json();
    return data.entitlements_token;
}

/**
 * Gets the Player UUID from the access token (JWT decode)
 */
export function getPuuidFromToken(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const payload = JSON.parse(jsonPayload);
    return payload.sub;
}

/**
 * Fetches all weapon skins from valorant-api.com
 */
export async function getAllSkins() {
    const response = await fetch(`${VALORANT_API_BASE}/weapons/skins`);
    const data = await response.json();
    return data.data;
}

/**
 * Fetches a specific skin by its UUID
 */
export async function getSkinByUuid(uuid) {
    const response = await fetch(`${VALORANT_API_BASE}/weapons/skins/${uuid}`);
    const data = await response.json();
    return data.data;
}

/**
 * Fetches the daily storefront for a player using their tokens.
 * This requires the Bearer token, Entitlements token, and Player UUID.
 */
export async function getPlayerStorefront(shard, puuid, bearer, entitlements) {
    const url = `https://pd.${shard}.a.pvp.net/store/v1/storefront/${puuid}`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${bearer}`,
            'X-Riot-Entitlements-JWT': entitlements,
            'X-Riot-ClientPlatform': 'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIndpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9',
            'X-Riot-ClientVersion': 'release-09.02-shipping-1-2673898'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch storefront: ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Helper to get skin details for a list of UUIDs
 */
export async function getSkinsDetails(uuids) {
    const allSkins = await getAllSkins();
    return uuids.map(uuid => {
        const skin = allSkins.find(s => s.levels[0].uuid === uuid || s.uuid === uuid);
        if (!skin) return null;

        // Find the correct level (usually the first one has the base icon)
        const displayIcon = skin.displayIcon || skin.levels[0].displayIcon;

        return {
            uuid: skin.uuid,
            name: skin.displayName,
            image: displayIcon,
            rarity: getRarityName(skin.contentTierUuid)
        };
    }).filter(Boolean);
}

function getRarityName(tierUuid) {
    const tiers = {
        "12683d76-48d7-84a3-44ab-c376c9ef804b": "Select",
        "0cebb8ab-4c8d-43a1-901e-450415f3303c": "Deluxe",
        "611d7fc4-2101-705a-fd43-5e7bc544f8f4": "Premium",
        "ed917316-1033-6523-8687-32b005e83696": "Ultra",
        "e046854e-406a-a5fb-5b23-28c460db702b": "Exclusive"
    };
    return tiers[tierUuid] || "Select";
}
