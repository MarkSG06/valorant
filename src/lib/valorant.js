const VALORANT_API_BASE = 'https://valorant-api.com/v1';

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
