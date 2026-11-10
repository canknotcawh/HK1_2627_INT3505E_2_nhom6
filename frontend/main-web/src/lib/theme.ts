export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "lms.theme";

export function getStoredTheme(): ThemePreference {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") return stored;
    } catch {
        // Storage can be blocked; fall back to the default theme.
    }
    return "dark";
}

export function storeTheme(preference: ThemePreference): void {
    try {
        localStorage.setItem(STORAGE_KEY, preference);
    } catch {
        // Ignore: the preference just won't persist.
    }
}

export function systemPrefersDark(): boolean {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveDark(preference: ThemePreference): boolean {
    return preference === "dark" || (preference === "system" && systemPrefersDark());
}

export function applyTheme(preference: ThemePreference): void {
    const root = document.documentElement;
    const dark = resolveDark(preference);
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
}
