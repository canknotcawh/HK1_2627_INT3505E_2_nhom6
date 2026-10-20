import { getAccessToken } from './auth-tokens';

const BASE_STORAGE_KEY = 'library_recent_searches';
const MAX_RECENT_SEARCHES = 5;

/**
 * Resolves the storage key scoped to the current user.
 * If userId is explicitly passed, use it.
 * Otherwise, attempt to decode the subject (sub) claim from the JWT access token in localStorage.
 * Defaults to 'guest' for unauthenticated sessions.
 */
export function getCurrentUserKey(explicitUserId?: string): string {
    if (explicitUserId) {
        return explicitUserId;
    }

    try {
        const token = getAccessToken();
        if (token) {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
                const payload = JSON.parse(payloadJson);
                if (payload && typeof payload.sub === 'string' && payload.sub) {
                    return payload.sub;
                }
            }
        }
    } catch {
        // Fall back to guest on malformed or missing token
    }

    return 'guest';
}

function getStorageKey(customUserKey?: string): string {
    const userKey = getCurrentUserKey(customUserKey);
    return `${BASE_STORAGE_KEY}_${userKey}`;
}

export function getRecentSearches(userKey?: string): string[] {
    try {
        const key = getStorageKey(userKey);
        const data = localStorage.getItem(key);
        if (!data) return [];
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            return parsed
                .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                .slice(0, MAX_RECENT_SEARCHES);
        }
    } catch (e) {
        console.error('Failed to parse recent searches:', e);
    }
    return [];
}

export function saveRecentSearch(query: string, userKey?: string): string[] {
    const trimmed = query.trim();
    if (!trimmed) return getRecentSearches(userKey);

    try {
        const key = getStorageKey(userKey);
        const current = getRecentSearches(userKey);
        // Deduplicate case-insensitively, keeping the latest search at the front
        const updated = [
            trimmed,
            ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
        ].slice(0, MAX_RECENT_SEARCHES);
        localStorage.setItem(key, JSON.stringify(updated));
        return updated;
    } catch (e) {
        console.error('Failed to save recent search:', e);
        return [];
    }
}

export function removeRecentSearch(query: string, userKey?: string): string[] {
    try {
        const key = getStorageKey(userKey);
        const current = getRecentSearches(userKey);
        const updated = current.filter((item) => item.toLowerCase() !== query.toLowerCase());
        localStorage.setItem(key, JSON.stringify(updated));
        return updated;
    } catch (e) {
        console.error('Failed to remove recent search:', e);
        return [];
    }
}

export function clearRecentSearches(userKey?: string): void {
    try {
        const key = getStorageKey(userKey);
        localStorage.removeItem(key);
    } catch (e) {
        console.error('Failed to clear recent searches:', e);
    }
}
